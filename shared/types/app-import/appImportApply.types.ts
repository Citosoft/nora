import type { AppImportDetectedSourceId, AppImportDetectionFailure, AppImportSourceId } from "./appImportSource.types";
import type { AppImportKey, AppImportPlan } from "./appImportPlan.types";

/** Plan sections the user can tick; each item in them carries an import key. */
export type AppImportItemKind = "workspace" | "thread" | "setupScript" | "terminalPreset" | "setting" | "keybinding" | "envVar" | "bot";

/** Whether Nora can take an item at all; unsupported items are shown but can't be ticked. */
export type AppImportItemSupport = { status: "supported" } | { status: "unsupported"; reason: string };

/** One app's part of the preview: its plan plus which items an earlier run (or the user) already brought into Nora. */
export type AppImportSourcePreview = { status: "ready"; source: AppImportSourceId; plan: AppImportPlan; importedKeys: AppImportKey[] } | AppImportDetectionFailure;

/** Every app Nora can import from, read together for one combined checklist. */
export interface AppImportPreview {
  sources: AppImportSourcePreview[];
}

/**
 * Ticked items for one app; main re-reads the source and applies only these. A bot export has no file Nora
 * can find again, so its text travels with the selection and is parsed again in main.
 */
export type AppImportSourceSelection =
  | { source: AppImportDetectedSourceId; selectedKeys: AppImportKey[] }
  | { source: "bot-export"; document: string; selectedKeys: AppImportKey[] };

export interface AppImportApplyRequest {
  selections: AppImportSourceSelection[];
  /** Echoed on progress events so a view can ignore an older run's events. */
  runId: string;
}

export type AppImportItemOutcome =
  | { status: "applied" }
  | { status: "alreadyImported" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; message: string };

export interface AppImportItemResult {
  source: AppImportSourceId;
  importKey: AppImportKey;
  kind: AppImportItemKind;
  label: string;
  outcome: AppImportItemOutcome;
}

export type AppImportThemeMode = "system" | "light" | "dark";

/** Preferences only the window can apply, because the renderer owns where they are stored. */
export interface AppImportRendererChanges {
  themeMode: AppImportThemeMode | null;
  /** Imported threads the source app had pinned. */
  pinnedConversationIds: string[];
}

export interface AppImportApplyResult {
  items: AppImportItemResult[];
  renderer: AppImportRendererChanges;
  /** Apps whose data could no longer be read when the import ran. */
  unavailable: AppImportDetectionFailure[];
}

export interface AppImportProgress {
  runId: string;
  completed: number;
  total: number;
  /** What is being imported now, for display. */
  label: string;
}
