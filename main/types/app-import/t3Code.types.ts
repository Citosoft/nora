import type { AppImportEnvVar, AppImportProviderRef, AppImportSetupScript, AppImportSkippedItem, AppImportTerminalPreset, AppImportWorkspace } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportSetting } from "@shared/types/app-import/appImportSetting.types";
import type { AppImportSourceKeybinding, AppImportThreadCandidate } from "./appImportSource.types";

export interface T3CodeSchemaInfo {
  schema: "v1" | "v2";
  migration: number | null;
  tables: ReadonlySet<string>;
}

/** Resolves a T3 Code provider instance id (e.g. `codex`, `codex_personal`) to its driver. */
export type T3CodeProviderResolver = (instanceId: string) => AppImportProviderRef;

export interface T3CodeServerSettings {
  resolveProvider: T3CodeProviderResolver;
  settings: AppImportSetting[];
  envVars: AppImportEnvVar[];
  skipped: AppImportSkippedItem[];
  warnings: string[];
}

export interface T3CodeKeybindings {
  keybindings: AppImportSourceKeybinding[];
  warnings: string[];
}

/** What a thread needs from its project: the workspace key and the fallback cwd. */
export interface T3CodeProjectLink {
  importKey: string;
  path: string;
}

export interface T3CodeProjects {
  workspaces: AppImportWorkspace[];
  setupScripts: AppImportSetupScript[];
  terminalPresets: AppImportTerminalPreset[];
  skipped: AppImportSkippedItem[];
  byProjectId: ReadonlyMap<string, T3CodeProjectLink>;
}

/** One thread row from either schema version, normalised before it is linked to a workspace. */
export interface T3CodeThreadRow {
  threadId: string;
  projectId: string;
  title: string;
  provider: AppImportProviderRef;
  model: string | undefined;
  nativeSessionId: string | undefined;
  runtimeCwd: string | undefined;
  branch: string | null;
  worktreePath: string | null;
  pinned: boolean;
  archived: boolean;
  deleted: boolean;
  subagent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface T3CodeThreads {
  candidates: AppImportThreadCandidate[];
  /** Import key → T3 Code thread id, for loading fallback transcripts. */
  sourceThreadIds: ReadonlyMap<string, string>;
  skipped: AppImportSkippedItem[];
}
