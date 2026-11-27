import type { AppImportDetection, AppImportDetectionFailure } from "@shared/types/app-import/appImportSource.types";
import type { AppImportBot, AppImportEnvVar, AppImportSetupScript, AppImportSkippedItem, AppImportTerminalPreset, AppImportWorkspace } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportSetting } from "@shared/types/app-import/appImportSetting.types";
import type { AppImportSourceKeybinding, AppImportThreadCandidate } from "./appImportSource.types";

/** Where the active profile's persisted state was found, in Orca's own load order. */
export type OrcaStoreLocation =
  | { store: "profileStateDb"; path: string; profileId: string }
  | { store: "profileJson"; path: string; profileId: string }
  | { store: "legacyJson"; path: string };

export interface OrcaStoreSearch {
  location: OrcaStoreLocation | null;
  searchedPaths: string[];
}

/** Persisted-state domains (top-level PersistedState keys) still as raw JSON; narrowed by each reader. */
export type OrcaStateDomains = ReadonlyMap<string, unknown>;

export type OrcaStoreRead =
  | { status: "ok"; domains: OrcaStateDomains; version: number | null }
  | { status: "unsupported"; reason: string }
  | { status: "unreadable"; reason: string };

export type OrcaLoadedStore = Extract<OrcaStoreRead, { status: "ok" }>;

export type OrcaLoad =
  | { status: "failed"; detection: AppImportDetectionFailure }
  | { status: "loaded"; detection: Extract<AppImportDetection, { status: "found" }>; store: OrcaLoadedStore };

/** One stored part of a split domain: the object path it sits at and its JSON text. */
export interface OrcaDocumentPart {
  path: readonly string[];
  payload: string;
}

/** A local Orca repo linked to its imported workspace. */
export interface OrcaRepoLink {
  repoId: string;
  importKey: string;
  path: string;
}

export interface OrcaRepos {
  workspaces: AppImportWorkspace[];
  setupScripts: AppImportSetupScript[];
  terminalPresets: AppImportTerminalPreset[];
  skipped: AppImportSkippedItem[];
  byRepoId: ReadonlyMap<string, OrcaRepoLink>;
  warnings: string[];
}

/** Worktree facts from `worktreeMeta`, keyed by `<repoId>::<absolute path>`. */
export interface OrcaWorktreeMeta {
  repoId: string;
  path: string;
  pinned: boolean;
  archived: boolean;
  baseRef: string | undefined;
}

export interface OrcaThreads {
  candidates: AppImportThreadCandidate[];
  /** Import key → the partial history Orca kept (first prompt, last reply). */
  transcripts: ReadonlyMap<string, OrcaTranscriptSeed>;
  skipped: AppImportSkippedItem[];
}

export interface OrcaTranscriptSeed {
  prompt: string | undefined;
  lastAssistantMessage: string | undefined;
  promptAt: string;
  replyAt: string;
}

/** One agent session found in Orca's workspace session, before it is linked to a repo. */
export interface OrcaThreadSeed {
  agent: string;
  sessionId: string;
  worktreeId: string;
  cwd: string | undefined;
  title: string | undefined;
  createdAt: number | undefined;
  updatedAt: number | undefined;
  transcript: Pick<OrcaTranscriptSeed, "prompt" | "lastAssistantMessage"> | undefined;
}

export interface OrcaThreadSeeds {
  seeds: OrcaThreadSeed[];
  unboundAgentTabs: number;
}

export interface OrcaWorktreeRef {
  repoId: string;
  path: string;
}

export interface OrcaSettings {
  settings: AppImportSetting[];
  envVars: AppImportEnvVar[];
  terminalPresets: AppImportTerminalPreset[];
  skipped: AppImportSkippedItem[];
}

export interface OrcaKeybindings {
  keybindings: AppImportSourceKeybinding[];
  warnings: string[];
}

/** Scripts and default tabs a repo commits in `orca.yaml`. */
export interface OrcaRepoFile {
  setupScripts: AppImportSetupScript[];
  terminalPresets: AppImportTerminalPreset[];
  warnings: string[];
}

export interface OrcaSkippedStores {
  skipped: AppImportSkippedItem[];
  warnings: string[];
}

/** Which of orca.yaml and the locally stored hook script Orca runs (hook-command-source-policy.ts). */
export type OrcaHookCommandSourcePolicy = "local-only" | "shared-only" | "run-both";

export interface OrcaBots {
  bots: AppImportBot[];
  skipped: AppImportSkippedItem[];
}
