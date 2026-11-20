import type { AppBuildStep, AppSummary } from "@shared/types/apps/apps.types";

/** What the builder view shows: the magic while a turn runs, the app when it is done, the chat when the agent needs the user. */
export type AppBuildPhase = { kind: "building" } | { kind: "ready" } | { kind: "attention" } | { kind: "failed"; message: string };

export interface AppBuilderState {
  documentId: string;
  app: AppSummary | null;
  phase: AppBuildPhase;
  /** The latest step the builder's tools reported for this turn, for the narration line. */
  step: AppBuildStep | null;
  /** When the current turn started, for the elapsed time shown in the scene. */
  startedAt: string | null;
  threadOpen: boolean;
  setThreadOpen(open: boolean): void;
  /** Sends a change request to the builder thread and shows the building scene. */
  send(text: string): void;
  /** The opening words the bar should take next, set when the user picks a card; `at` makes the same pick twice count twice. */
  draft: AppBuilderDraft | null;
  pick: AppBuilderPickHandler;
  /** Interrupts the builder's running turn; null when nothing is running or it is already stopping. */
  stop: (() => void) | null;
  stopping: boolean;
}
export interface AppBuilderDraft { text: string; at: number; }
/** Called with a card's title when the user clicks it in the builder preview. */
export type AppBuilderPickHandler = (cardTitle: string) => void;

export interface AppBuildingSceneProps {
  phase: Exclude<AppBuildPhase, { kind: "ready" }>;
  step: AppBuildStep | null;
  startedAt: string | null;
  /** True while changing an existing app, which reads differently from a first build. */
  update: boolean;
  onOpenThread(): void;
  onStop: (() => void) | null;
  stopping: boolean;
}
export interface AppBuilderBarProps {
  busy: boolean;
  threadOpen: boolean;
  draft: AppBuilderDraft | null;
  /** The builder's suggested next changes, sent as they are when clicked. */
  suggestions: readonly string[];
  onSend(text: string): void;
  onToggleThread(): void;
}
export interface AppBuilderDrawerProps { documentId: string; open: boolean; onClose(): void; }
