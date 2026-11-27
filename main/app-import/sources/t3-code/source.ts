import { appImportSourceDisplayName } from "@shared/app-import/sources";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { pathExists } from "@main/app-import/fileSystem";
import { openReadonlySqlite, withReadonlySqlite } from "@main/app-import/readonlySqlite";
import { mapAppImportKeybindings } from "@main/app-import/keybindingMapping";
import { resolveImportThreads } from "@main/app-import/threadResolution";
import type { AppImportDetection } from "@shared/types/app-import/appImportSource.types";
import type { AppImportReadResult } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportEnvironment, AppImportReadContext, AppImportSource } from "@main/types/app-import/appImportSource.types";
import { t3CodeKeybindingMapping } from "./keybindingMapping";
import { readT3CodeKeybindings } from "./keybindings";
import { T3_CODE_DATABASE_FILES, t3CodeStateDirectories } from "./paths";
import { readT3CodeProjects } from "./projects";
import { listT3CodeProtectedStores } from "./protectedStores";
import { readT3CodeSchema } from "./schema";
import { readT3CodeServerSettings } from "./serverSettings";
import { readT3CodeThreads } from "./threads";
import { readT3CodeTranscript } from "./transcripts";

const DISPLAY_NAME = appImportSourceDisplayName("t3-code");

async function detectT3Code(env: AppImportEnvironment): Promise<AppImportDetection> {
  const searchedPaths: string[] = [];
  for (const stateDir of t3CodeStateDirectories(env)) {
    for (const file of T3_CODE_DATABASE_FILES) {
      const databasePath = path.join(stateDir, file);
      searchedPaths.push(databasePath);
      if (!await pathExists(databasePath)) continue;
      try {
        const schema = withReadonlySqlite(databasePath, readT3CodeSchema);
        if (!schema) return { status: "unsupported", source: "t3-code", dataPath: databasePath, reason: "This T3 Code database layout is not recognised." };
        return { status: "found", source: "t3-code", dataPath: databasePath, format: { source: "t3-code", schema: schema.schema, migration: schema.migration } };
      } catch (error) {
        return { status: "unreadable", source: "t3-code", dataPath: databasePath, reason: error instanceof Error ? error.message : "Could not open the T3 Code database." };
      }
    }
  }
  return { status: "notFound", source: "t3-code", searchedPaths };
}

async function readT3CodePlan(context: AppImportReadContext): Promise<AppImportReadResult> {
  const detection = await detectT3Code(context.env);
  if (detection.status !== "found") return detection;
  const stateDir = path.dirname(detection.dataPath);
  const [serverSettings, keybindings] = await Promise.all([readT3CodeServerSettings(stateDir), readT3CodeKeybindings(stateDir)]);
  let database: DatabaseSync;
  try {
    database = openReadonlySqlite(detection.dataPath);
  } catch (error) {
    return { status: "unreadable", source: "t3-code", dataPath: detection.dataPath, reason: error instanceof Error ? error.message : "Could not open the T3 Code database." };
  }
  try {
    const schema = readT3CodeSchema(database);
    if (!schema) return { status: "unsupported", source: "t3-code", dataPath: detection.dataPath, reason: "This T3 Code database layout is not recognised." };
    const projects = await readT3CodeProjects(database, serverSettings.resolveProvider);
    const threads = readT3CodeThreads(database, schema, projects, serverSettings.resolveProvider);
    const mappedKeybindings = mapAppImportKeybindings(keybindings.keybindings, t3CodeKeybindingMapping);
    const resolved = await resolveImportThreads(threads.candidates, context.sessions, (thread) => {
      const threadId = threads.sourceThreadIds.get(thread.importKey);
      return threadId ? readT3CodeTranscript(database, schema, threadId) : undefined;
    });
    return {
      status: "ready",
      plan: {
        source: { id: "t3-code", displayName: DISPLAY_NAME, dataPath: stateDir, format: detection.format },
        workspaces: projects.workspaces,
        threads: resolved.threads,
        setupScripts: projects.setupScripts,
        terminalPresets: projects.terminalPresets,
        settings: serverSettings.settings,
        keybindings: mappedKeybindings.keybindings,
        envVars: serverSettings.envVars,
        bots: [],
        skipped: [...projects.skipped, ...threads.skipped, ...serverSettings.skipped, ...mappedKeybindings.skipped, ...await listT3CodeProtectedStores(stateDir, database, schema.tables)],
        warnings: [...serverSettings.warnings, ...keybindings.warnings, ...resolved.warnings]
      }
    };
  } finally {
    database.close();
  }
}

export const t3CodeSource: AppImportSource = { id: "t3-code", displayName: DISPLAY_NAME, detect: detectT3Code, readPlan: readT3CodePlan };
