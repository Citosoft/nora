import { readdir } from "node:fs/promises";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { appImportSourceDisplayName } from "@shared/app-import/sources";
import type { AppImportBot, AppImportReadResult, AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportDetection } from "@shared/types/app-import/appImportSource.types";
import type { AppImportBotRoutineDraft, OpenBotAgentRecord } from "@main/types/app-import/appImportBots.types";
import type { AppImportEnvironment, AppImportReadContext, AppImportSource } from "@main/types/app-import/appImportSource.types";
import { fitAppImportBot } from "@main/app-import/bots/fitBot";
import { pathExists, readTextFile } from "@main/app-import/fileSystem";
import { appImportKey } from "@main/app-import/importKey";
import { openReadonlySqlite, sqliteSelectList, sqliteTableNames } from "@main/app-import/readonlySqlite";
import { OPENBOT_DATABASE, openBotAgentsDirectory, openBotDataDirectory } from "./paths";
import { activeOpenBotServerName } from "./remoteServers";
import { openBotSchedule } from "./schedule";

const DISPLAY_NAME = appImportSourceDisplayName("openbot");
const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function agentIdFromFolder(folder: string): string {
  return folder.replace(/^(agent|bot)-/, "");
}

/** A readable name from a folder id like `research-helper`; random ids get a generic name. */
function nameFromId(id: string): string | null {
  if (UUID_PREFIX.test(id)) return null;
  return id.split(/[-_]+/).filter(Boolean).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ") || null;
}

async function agentFolders(env: AppImportEnvironment): Promise<string[]> {
  const entries = await readdir(openBotAgentsDirectory(env), { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name).sort();
}

/** Only the columns Orca's import notes name are read: agent identity, memory text, routine timing, MCP name and address. */
function select(database: DatabaseSync, tables: ReadonlySet<string>, table: string, columns: readonly string[]): Row[] {
  if (!tables.has(table)) return [];
  return database.prepare(`SELECT ${sqliteSelectList(database, table, columns)} FROM ${JSON.stringify(table)}`).all();
}

function agentJsonField(row: Row, field: string): string | null {
  if (typeof row.agent_json !== "string") return null;
  try {
    const value: unknown = JSON.parse(row.agent_json);
    return value && typeof value === "object" ? text((value as Row)[field]) : null;
  } catch { return null; }
}

interface OpenBotDatabase {
  agents: OpenBotAgentRecord[];
  memories: Map<string, string[]>;
  routines: Map<string, AppImportBotRoutineDraft[]>;
  mcpServers: string[];
}

function routineDraft(routine: Row, triggers: readonly Row[]): AppImportBotRoutineDraft {
  const name = text(routine.name) ?? "Routine";
  const instruction = text(routine.instruction) ?? text(routine.prompt) ?? "";
  const timezone = text(routine.timezone) ?? text(routine.time_zone);
  const scheduleTriggers = triggers.filter((trigger) => !trigger.kind || /schedule|cron|time|interval/i.test(String(trigger.kind)));
  if (triggers.length && !scheduleTriggers.length) return { name, instruction, timezone, schedule: null, unsupportedReason: "It runs on events, which Nora routines don't support." };
  const schedule = openBotSchedule([routine.schedule, routine.schedule_json, routine.cron, routine.cron_expression,
    ...scheduleTriggers.flatMap((trigger) => [trigger.schedule, trigger.schedule_json, trigger.cron, trigger.cron_expression])]);
  return schedule ? { name, instruction, timezone, schedule } : { name, instruction, timezone, schedule: null, unsupportedReason: "Nora couldn't read its schedule." };
}

function readDatabase(database: DatabaseSync): OpenBotDatabase {
  const tables = sqliteTableNames(database);
  const agents = select(database, tables, "projection_agents", ["agent_id", "agent_json"]).flatMap((row): OpenBotAgentRecord[] => {
    const id = text(row.agent_id);
    if (!id) return [];
    const role = agentJsonField(row, "title") ?? agentJsonField(row, "description") ?? "";
    return [{ id, name: agentJsonField(row, "name"), role, folder: null }];
  });
  const memories = new Map<string, string[]>();
  for (const row of select(database, tables, "projection_agent_memories", ["agent_id", "text"])) {
    const id = text(row.agent_id);
    const note = text(row.text);
    if (id && note) memories.set(id, [...memories.get(id) ?? [], note]);
  }
  const triggers = select(database, tables, "projection_routine_triggers", ["routine_id", "kind", "schedule", "schedule_json", "cron", "cron_expression"]);
  const routines = new Map<string, AppImportBotRoutineDraft[]>();
  for (const row of select(database, tables, "projection_agent_routines", ["routine_id", "agent_id", "name", "instruction", "prompt", "timezone", "time_zone", "schedule", "schedule_json", "cron", "cron_expression"])) {
    const agentId = text(row.agent_id);
    if (!agentId) continue;
    const own = triggers.filter((trigger) => trigger.routine_id !== null && trigger.routine_id === row.routine_id);
    routines.set(agentId, [...routines.get(agentId) ?? [], routineDraft(row, own)]);
  }
  const mcpServers = select(database, tables, "projection_mcp_servers", ["name"]).flatMap((row) => text(row.name) ?? []);
  return { agents, memories, routines, mcpServers };
}

/** The folder's AGENTS.md (or CLAUDE.md when it isn't just a pointer to AGENTS.md), then each skill as its own section. */
async function folderInstructions(folder: string): Promise<string> {
  const agents = await readTextFile(path.join(folder, "AGENTS.md"));
  const claude = await readTextFile(path.join(folder, "CLAUDE.md"));
  const main = agents.status === "ok" ? agents.text.trim() : claude.status === "ok" && !/^@AGENTS\.md\s*$/.test(claude.text.trim()) ? claude.text.trim() : "";
  const sections = [main];
  for (const skillsRoot of [path.join(folder, ".agents", "skills"), path.join(folder, ".claude", "skills")]) {
    const skills = await readdir(skillsRoot, { withFileTypes: true }).catch(() => []);
    for (const skill of skills.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()) {
      const body = await readTextFile(path.join(skillsRoot, skill, "SKILL.md"));
      if (body.status === "ok" && body.text.trim()) sections.push(`## Skill: ${skill}\n\n${body.text.trim()}`);
    }
  }
  return sections.filter(Boolean).join("\n\n");
}

async function detectOpenBot(env: AppImportEnvironment): Promise<AppImportDetection> {
  const data = openBotDataDirectory(env);
  const agents = openBotAgentsDirectory(env);
  const databasePath = path.join(data, OPENBOT_DATABASE);
  const remoteServer = await activeOpenBotServerName(env);
  if (await pathExists(databasePath)) return { status: "found", source: "openbot", dataPath: databasePath, format: { source: "openbot", store: "database", remoteServer } };
  if (await pathExists(agents)) return { status: "found", source: "openbot", dataPath: agents, format: { source: "openbot", store: "agentFolders", remoteServer } };
  return { status: "notFound", source: "openbot", searchedPaths: [databasePath, agents] };
}

/**
 * OpenBot agents, from its database (names, memories, routines) joined with each agent's folder (instructions and
 * skills). Env vars, headers, keys and sign-ins are never read; MCP servers are listed for the user to add again.
 */
async function readOpenBotPlan(context: AppImportReadContext): Promise<AppImportReadResult> {
  const detection = await detectOpenBot(context.env);
  if (detection.status !== "found") return detection;
  let database: OpenBotDatabase = { agents: [], memories: new Map(), routines: new Map(), mcpServers: [] };
  if (detection.format.source === "openbot" && detection.format.store === "database") {
    try {
      const handle = openReadonlySqlite(detection.dataPath);
      try { database = readDatabase(handle); } finally { handle.close(); }
    } catch (error) {
      return { status: "unreadable", source: "openbot", dataPath: detection.dataPath, reason: error instanceof Error ? error.message : "Could not open the OpenBot database." };
    }
  }
  const folders = await agentFolders(context.env);
  const agents = new Map(database.agents.map((agent) => [agent.id, agent]));
  for (const folder of folders) {
    const id = agentIdFromFolder(folder);
    const known = agents.get(id);
    agents.set(id, known ? { ...known, folder } : { id, name: null, role: "", folder });
  }
  const bots: AppImportBot[] = [];
  const skipped: AppImportSkippedItem[] = [];
  for (const agent of agents.values()) {
    const instructions = agent.folder ? await folderInstructions(path.join(openBotAgentsDirectory(context.env), agent.folder)) : "";
    const fitted = fitAppImportBot({
      importKey: appImportKey("openbot", "bot", agent.id), name: agent.name ?? nameFromId(agent.id) ?? "OpenBot agent", role: agent.role, instructions,
      model: null, avatar: { shape: null, palette: null }, memory: database.memories.get(agent.id) ?? [], routines: database.routines.get(agent.id) ?? []
    });
    bots.push(fitted.bot);
    skipped.push(...fitted.skipped);
  }
  skipped.push(...database.mcpServers.map((name): AppImportSkippedItem => ({ kind: "bot", label: `MCP server "${name}"`, reason: "Add it again in Settings → Connections; tools need signing in again." })));
  return { status: "ready", plan: { source: { id: "openbot", displayName: DISPLAY_NAME, dataPath: detection.dataPath, format: detection.format },
    workspaces: [], threads: [], setupScripts: [], terminalPresets: [], settings: [], keybindings: [], envVars: [], bots, skipped, warnings: [] } };
}

export const openBotSource: AppImportSource = { id: "openbot", displayName: DISPLAY_NAME, detect: detectOpenBot, readPlan: readOpenBotPlan };
