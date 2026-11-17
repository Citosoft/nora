import { lstat, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { isNodeError } from "@main/nodeErrors";
import { parseSharedBotFile, serializeSharedBotFile, sharedBotFileName, SHARED_BOT_DIRECTORY, SHARED_BOT_EXTENSION, SHARED_BOT_MAX_BYTES } from "@shared/bots/botFile";
import type { BotDefinition, BotFileProblem, SharedBotSet } from "@shared/types/bots/bots.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { SharedBotLibrary } from "@main/types/bots/sharedBots.types";

const MAX_BOT_FILES = 200;

/** The bot directory must be a real directory inside the workspace; a symlink could point outside it. */
async function botDirectory(workspace: NativeWorkspace, create: boolean): Promise<string | null> {
  const root = workspace.workspace.path;
  let current = root;
  for (const segment of SHARED_BOT_DIRECTORY.split("/")) {
    current = join(current, segment);
    try {
      const info = await lstat(current);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`${SHARED_BOT_DIRECTORY} must be a regular directory in this workspace`);
    } catch (error) {
      if (!isNodeError(error) || error.code !== "ENOENT") throw error;
      if (!create) return null;
      await mkdir(current);
    }
  }
  return current;
}

async function readSet(workspace: NativeWorkspace): Promise<SharedBotSet> {
  const bots: BotDefinition[] = [];
  const problems: BotFileProblem[] = [];
  const set = { workspaceId: workspace.id, bots, problems };
  // A missing or unreadable workspace reports a problem instead of failing every other workspace's bots.
  let directory: string | null;
  let names: string[];
  try {
    directory = await botDirectory(workspace, false);
    if (!directory) return set;
    names = (await readdir(directory)).filter((name) => name.endsWith(SHARED_BOT_EXTENSION)).sort().slice(0, MAX_BOT_FILES);
  } catch (error) {
    if (isNodeError(error) && (error.code === "ENOENT" || error.code === "ENOTDIR")) return set;
    problems.push({ file: SHARED_BOT_DIRECTORY, message: error instanceof Error ? error.message : "Bot files could not be read" });
    return set;
  }
  for (const name of names) {
    const file = `${SHARED_BOT_DIRECTORY}/${name}`;
    try {
      const info = await lstat(join(directory, name));
      if (!info.isFile()) { problems.push({ file, message: "Bot files must be regular files" }); continue; }
      if (info.size > SHARED_BOT_MAX_BYTES) { problems.push({ file, message: "Bot files must be 64 KB or smaller" }); continue; }
      const parsed = parseSharedBotFile(name, await readFile(join(directory, name), "utf8"), workspace.id);
      if (parsed.ok) bots.push(parsed.bot); else problems.push({ file, message: parsed.message });
    } catch (error) { problems.push({ file, message: error instanceof Error ? error.message : "This bot file could not be read" }); }
  }
  return set;
}

export function createSharedBotLibrary(): SharedBotLibrary {
  let sets: SharedBotSet[] = [];
  return {
    list: () => structuredClone(sets),
    async refresh(workspaces) { sets = await Promise.all(workspaces.map(readSet)); },
    async write(workspace, bot) {
      const directory = await botDirectory(workspace, true);
      if (!directory) throw new Error("The workspace bot directory could not be created");
      const target = join(directory, sharedBotFileName(bot.id));
      const temporary = `${target}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, serializeSharedBotFile(bot), { flag: "wx" });
        await rename(temporary, target);
      } finally { await rm(temporary, { force: true }); }
    },
    async remove(workspace, botId) {
      const directory = await botDirectory(workspace, false);
      if (directory) await rm(join(directory, sharedBotFileName(botId)), { force: true });
    }
  };
}
