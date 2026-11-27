import type { Accelerator, KeybindingCommandId } from "@shared/types/keybindings/keybindings.types";
import type { NativeProviderKind } from "@shared/types/provider/providerKind.types";
import type { BotAvatarPalette, BotAvatarShape } from "@shared/types/bots/bots.types";
import type { RoutineSchedule } from "@shared/types/bots/routines.types";
import type { AppImportDetectionFailure, AppImportFormat, AppImportSourceId } from "./appImportSource.types";
import type { AppImportSetting } from "./appImportSetting.types";

/**
 * Stable identity of an imported item: `<source>:<kind>:<source-native id>`.
 * Re-running an import with the same source data yields the same keys, so apply can dedupe.
 */
export type AppImportKey = string;

/** Provider of a thread or setting: Nora's native kinds, or `other` with the raw id kept in `sourceProvider`. */
export type AppImportProvider = NativeProviderKind | "other";

export interface AppImportProviderRef {
  provider: AppImportProvider;
  /** The source app's own provider/agent id, kept verbatim (e.g. `claudeAgent`, `gemini`). */
  sourceProvider: string;
}

export interface AppImportModelRef extends AppImportProviderRef {
  model: string;
}

export interface AppImportWorkspace {
  importKey: AppImportKey;
  name: string;
  path: string;
  /** Whether the path is still a directory on this machine. */
  pathExists: boolean;
  pinned: boolean;
  archived: boolean;
  defaultModel?: AppImportModelRef;
}

export interface AppImportTranscriptMessage {
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

export interface AppImportTranscript {
  /** `partial` when the source kept only some messages (e.g. Orca's first prompt and last reply). */
  completeness: "full" | "partial";
  messages: AppImportTranscriptMessage[];
}

export interface AppImportThread extends AppImportProviderRef {
  importKey: AppImportKey;
  workspaceImportKey: AppImportKey;
  title: string;
  model?: string;
  /** Claude session id or Codex thread id the source app ran this thread under. */
  nativeSessionId?: string;
  cwd: string;
  branch?: string;
  worktreePath?: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  /** True when Nora's Claude/Codex history readers can still find the native session for this cwd. */
  resumable: boolean;
  /** Fallback history, attached only when the thread is not resumable and the source stored message text. */
  transcript?: AppImportTranscript;
}

export type AppImportScriptPhase = "setup" | "archive";

export interface AppImportSetupScript {
  importKey: AppImportKey;
  workspaceImportKey: AppImportKey;
  phase: AppImportScriptPhase;
  label: string;
  command: string;
  /** `appSettings` = stored in the source app; `repoFile` = committed in the repository (e.g. `orca.yaml`). */
  origin: "appSettings" | "repoFile";
}

export type AppImportTerminalPresetAction =
  | { action: "command"; command: string; appendEnter: boolean }
  | { action: "agentPrompt"; agent: AppImportProviderRef; prompt: string };

export type AppImportTerminalPreset = AppImportTerminalPresetAction & {
  importKey: AppImportKey;
  /** Null for presets available in every workspace. */
  workspaceImportKey: AppImportKey | null;
  label: string;
  /** Where the source app surfaces it: a quick command, a default tab for new worktrees, or a project script. */
  origin: "quickCommand" | "defaultTab" | "projectScript";
};

/**
 * A shortcut the user customised in the source app, already mapped to a Nora command. Bindings that only
 * repeat the source app's defaults, or that have no Nora equivalent, never reach the plan as keybindings.
 */
export interface AppImportKeybinding {
  importKey: AppImportKey;
  sourceCommand: string;
  /** Chord as written by the source app; null means the source app unbinds the command. */
  sourceChord: string | null;
  commandId: KeybindingCommandId;
  /** Canonical Electron accelerator; null unbinds the Nora command. */
  accelerator: Accelerator | null;
}

export type AppImportEnvVarScope =
  | { kind: "global" }
  | { kind: "provider"; provider: AppImportProviderRef };

export interface AppImportEnvVar {
  importKey: AppImportKey;
  name: string;
  value: string;
  scope: AppImportEnvVarScope;
  /** Environment values can carry credentials; apply must ask before importing them. */
  sensitive: true;
  selectedByDefault: false;
}

/** A routine a bot brings along; imported paused, since enabling a schedule is the user's call. */
export interface AppImportBotRoutine {
  name: string;
  instruction: string;
  schedule: RoutineSchedule;
  /** IANA timezone the source used; null takes the computer's own. */
  timezone: string | null;
}

/** A bot configuration, already fitted to Nora's limits (anything shortened is listed in `adjustments`). */
export interface AppImportBot {
  importKey: AppImportKey;
  name: string;
  role: string;
  instructions: string;
  /** Provider and model the source ran it on; null lets Nora pick its default. */
  model: (AppImportProviderRef & { model: string | null }) | null;
  avatar: { shape: BotAvatarShape | null; palette: BotAvatarPalette | null };
  memory: string[];
  routines: AppImportBotRoutine[];
  /** What was changed to fit Nora, e.g. instructions shortened. */
  adjustments: string[];
}

export type AppImportSkippedKind =
  | "bot"
  | "secret"
  | "account"
  | "sshTarget"
  | "remoteWorkspace"
  | "workspace"
  | "thread"
  | "setting"
  | "envVar"
  | "keybinding"
  | "unsupported";

/** Something the source app has that the import intentionally leaves behind. */
export interface AppImportSkippedItem {
  kind: AppImportSkippedKind;
  label: string;
  reason: string;
}

export interface AppImportPlan {
  source: { id: AppImportSourceId; displayName: string; dataPath: string; format: AppImportFormat };
  workspaces: AppImportWorkspace[];
  threads: AppImportThread[];
  setupScripts: AppImportSetupScript[];
  terminalPresets: AppImportTerminalPreset[];
  settings: AppImportSetting[];
  keybindings: AppImportKeybinding[];
  envVars: AppImportEnvVar[];
  bots: AppImportBot[];
  skipped: AppImportSkippedItem[];
  /** Non-fatal problems while reading (unreadable side files, failed session lookups). */
  warnings: string[];
}

export type AppImportReadResult = { status: "ready"; plan: AppImportPlan } | AppImportDetectionFailure;
