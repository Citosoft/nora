import type { AppImportItemKind, AppImportItemResult, AppImportProgress, AppImportThemeMode } from "@shared/types/app-import/appImportApply.types";
import type { AppImportKey } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportSourcePreview } from "@shared/types/app-import/appImportApply.types";
import type { AppImportDetectedSourceId, AppImportSourceId } from "@shared/types/app-import/appImportSource.types";
import type { BotAvatar } from "@shared/types/bots/bots.types";
import type { APP_IMPORT_BOT_SOURCE_IDS } from "@shared/app-import/sources";

/** Onboarding keeps bots in their own step; "work" is everything else. */
export type AppImportFlowScope = "work" | "bots";

/** A tab in the bots step: an app with bots on disk, or Grok Bot (bots arrive as a pasted export). */
export type AppImportBotTabId = (typeof APP_IMPORT_BOT_SOURCE_IDS)[number] | "grok-bot";

/** Tabs that take a pasted export: Grok Bot keeps every bot on its servers, OpenBot does when connected to one. */
export type AppImportBotExportTabId = Extract<AppImportBotTabId, "openbot" | "grok-bot">;

/** A pasted or chosen bot export, the tab it was added on, and what Nora read from it. */
export interface AppImportBotExportEntry {
  tab: AppImportBotExportTabId;
  document: string;
  preview: Extract<AppImportSourcePreview, { status: "ready" }>;
}

/** How a tab's export panel tells the user to get an export out of that app. */
export interface AppImportBotExportGuide {
  tab: AppImportBotExportTabId;
  appName: string;
  title: string;
  description: string;
  /** The step that says where to send the prompt. */
  sendStep: string;
}

export interface AppImportBotTab {
  id: AppImportBotTabId;
  label: string;
  checklist: AppImportChecklist;
  /** Context shown above the tab's bots, e.g. that the app keeps its bots on a server. */
  notice: string | null;
  /** Set when the tab takes a pasted export. */
  exportGuide: AppImportBotExportGuide | null;
}

export interface AppImportBotTabsViewProps {
  tabs: AppImportBotTab[];
  /** The open tab; null opens the first tab with bots. Owned by the caller so it survives "Look again". */
  activeTab: AppImportBotTabId | null;
  onActiveTabChange(tab: AppImportBotTabId): void;
  selected: ReadonlySet<AppImportKey>;
  disabled: boolean;
  botExport: AppImportBotExportController;
  onToggleRow(row: AppImportRow): void;
  onSetGroup(group: AppImportRowGroup, selected: boolean): void;
}

export interface AppImportBotTabIconProps {
  tab: AppImportBotTabId;
  className?: string;
}

/** Where a ticked key goes in the apply request: an app on disk, or the export text it came from. */
export type AppImportSelectionTarget = { source: AppImportDetectedSourceId } | { source: "bot-export"; document: string };

export type AppImportBadgeVariant = "secondary" | "success" | "warning" | "outline";

export interface AppImportBadge {
  label: string;
  variant: AppImportBadgeVariant;
}

/** One app's line in the source summary. */
export interface AppImportSourceSummary {
  /** Unique per card: the app id, or the export's own key for pasted exports. */
  id: string;
  source: AppImportSourceId;
  name: string;
  found: boolean;
  /** What was found, or why nothing could be read. */
  description: string;
}

/**
 * One checklist row. A project folder several apps know about is a single row carrying every app's key,
 * so ticking it imports the folder once and lets each app's threads and scripts find it.
 */
export interface AppImportRow {
  id: string;
  kind: AppImportItemKind;
  label: string;
  detail: string | null;
  sources: AppImportSourceId[];
  /** Keys the row ticks; empty when nothing in it can be imported. */
  keys: AppImportKey[];
  badge: AppImportBadge | null;
  /** Bot rows show the face the bot will have in Nora. */
  avatar: BotAvatar | null;
  unsupportedReason: string | null;
  /** Never ticked by "Select all" (environment variables may hold credentials). */
  sensitive: boolean;
}

export interface AppImportRowGroup {
  kind: AppImportItemKind;
  title: string;
  rows: AppImportRow[];
}

export interface AppImportLeftBehind {
  source: AppImportSourceId;
  label: string;
  reason: string;
}

export interface AppImportChecklist {
  sources: AppImportSourceSummary[];
  groups: AppImportRowGroup[];
  /** Which app (or export) each key belongs to, for building the apply request. */
  keyTargets: ReadonlyMap<AppImportKey, AppImportSelectionTarget>;
  defaultSelection: ReadonlySet<AppImportKey>;
  leftBehind: AppImportLeftBehind[];
  warnings: string[];
  hasSensitive: boolean;
}

export type AppImportPhase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; checklist: AppImportChecklist }
  | { kind: "applying"; checklist: AppImportChecklist; progress: AppImportProgress | null }
  | { kind: "done"; results: AppImportItemResult[]; unavailable: string[] }
  | { kind: "failed"; message: string };

export interface AppImportFlowOptions {
  scope: AppImportFlowScope;
  /** Reads the apps the first time this is true, so onboarding only scans once the user reaches the step. */
  enabled: boolean;
  /** Applies an imported appearance; the caller owns where theme preferences live. */
  onThemeMode(mode: AppImportThemeMode): void;
}

export interface AppImportFlowController {
  scope: AppImportFlowScope;
  phase: AppImportPhase;
  selected: ReadonlySet<AppImportKey>;
  applying: boolean;
  toggleRow(row: AppImportRow): void;
  setGroupSelected(group: AppImportRowGroup, selected: boolean): void;
  /** The bots step's tabs; empty for the work checklist. */
  botTabs: AppImportBotTab[];
  apply(): void;
  /** Reads every app again, e.g. after an import or to retry a failed read. */
  reload(): void;
  botExport: AppImportBotExportController;
}

export interface AppImportBotExportController {
  /** The tab whose export is being read, if any. */
  readingTab: AppImportBotExportTabId | null;
  error: { tab: AppImportBotExportTabId; message: string } | null;
  /** Reads a pasted reply or chosen file and adds its bots to that tab's checklist. */
  add(tab: AppImportBotExportTabId, document: string): void;
}

export interface AppImportBotExportPanelProps {
  guide: AppImportBotExportGuide;
  botExport: AppImportBotExportController;
  disabled: boolean;
}

export interface AppImportOutcomeCounts {
  applied: number;
  alreadyImported: number;
  skipped: number;
  failed: number;
}

export interface AppImportFlowViewProps {
  flow: AppImportFlowController;
}

export interface AppImportSourceSummaryViewProps {
  sources: AppImportSourceSummary[];
}

export interface AppImportChecklistViewProps {
  checklist: AppImportChecklist;
  selected: ReadonlySet<AppImportKey>;
  disabled: boolean;
  onToggleRow(row: AppImportRow): void;
  onSetGroup(group: AppImportRowGroup, selected: boolean): void;
}

export interface AppImportRowGroupViewProps {
  group: AppImportRowGroup;
  selected: ReadonlySet<AppImportKey>;
  disabled: boolean;
  onToggleRow(row: AppImportRow): void;
  onSetGroup(group: AppImportRowGroup, selected: boolean): void;
}

export interface AppImportRowViewProps {
  row: AppImportRow;
  checked: boolean;
  disabled: boolean;
  onToggle(row: AppImportRow): void;
}

export interface AppImportResultViewProps {
  results: AppImportItemResult[];
  unavailable: string[];
}

export interface AppImportSourceIconProps {
  source: AppImportSourceId;
  /** Size and spacing of the icon box. */
  className?: string;
}

export interface AppImportLeftBehindViewProps {
  items: AppImportLeftBehind[];
}
