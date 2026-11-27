import type { AppImportDetectedSourceId, AppImportDetection } from "@shared/types/app-import/appImportSource.types";
import type { AppImportKey, AppImportKeybinding, AppImportReadResult, AppImportSkippedItem, AppImportThread, AppImportTranscript } from "@shared/types/app-import/appImportPlan.types";
import type { KeybindingCommandId } from "@shared/types/keybindings/keybindings.types";
import type { NativeProviderKind } from "@shared/types/provider/providerKind.types";

/** Machine facts a source needs to find its data; injected so tests can point at temp directories. */
export interface AppImportEnvironment {
  homeDir: string;
  platform: NodeJS.Platform;
  /** Windows `%APPDATA%`; null when unset. */
  appDataDir: string | null;
  /** Linux `XDG_CONFIG_HOME`; null when unset. */
  xdgConfigHome: string | null;
  /** Source-specific overrides such as `T3CODE_HOME`. */
  variables: Readonly<Record<string, string | undefined>>;
}

/** Answers which native Claude/Codex sessions Nora can still open for a directory. */
export interface NativeSessionLookup {
  listSessionIds(provider: NativeProviderKind, cwd: string): Promise<ReadonlySet<string>>;
}

export interface AppImportReadContext {
  env: AppImportEnvironment;
  sessions: NativeSessionLookup;
}

/** One app Nora can migrate from. Sources only read; they never write to the source app's files. */
export interface AppImportSource {
  id: AppImportDetectedSourceId;
  displayName: string;
  detect(env: AppImportEnvironment): Promise<AppImportDetection>;
  readPlan(context: AppImportReadContext): Promise<AppImportReadResult>;
}

/** A thread as read from the source, before session lookup decides resumability and fallback history. */
export type AppImportThreadCandidate = Omit<AppImportThread, "resumable" | "transcript">;

export interface AppImportThreadResolution {
  threads: AppImportThread[];
  warnings: string[];
}

/** Fallback history for a thread whose native session is gone; undefined when the source stored none. */
export type AppImportTranscriptLoader = (thread: AppImportThreadCandidate) => AppImportTranscript | undefined;

/** Item kinds that carry an import key; part of the key so ids from different tables never collide. */
export type AppImportKeyKind = "workspace" | "thread" | "setupScript" | "terminalPreset" | "setting" | "keybinding" | "envVar" | "bot";

export type AppImportTextFile =
  | { status: "missing" }
  | { status: "invalid"; reason: string }
  | { status: "ok"; text: string };

export type AppImportJsonFile =
  | { status: "missing" }
  | { status: "invalid"; reason: string }
  | { status: "ok"; value: unknown };

/** A binding exactly as the source app stores it, before mapping to Nora commands. */
export interface AppImportSourceKeybinding {
  importKey: AppImportKey;
  sourceCommand: string;
  /** Null means the source app unbinds the command. */
  chord: string | null;
  when?: string;
}

/** How one source app's shortcut vocabulary translates to Nora's. */
export interface AppImportKeybindingMapping {
  sourceName: string;
  commands: Readonly<Record<string, KeybindingCommandId>>;
  /** True when the binding only repeats the source app's own default, so importing it would override Nora's default for nothing. */
  isSourceDefault(binding: AppImportSourceKeybinding): boolean;
}

export interface AppImportKeybindingMappingResult {
  keybindings: AppImportKeybinding[];
  skipped: AppImportSkippedItem[];
}
