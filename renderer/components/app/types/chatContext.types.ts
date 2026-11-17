import type { DirectContextModelRequest, DirectContextPreview, DirectContextSection, DirectContextTarget } from "@shared/ipc/types/directContextGateway.types";

/** A request section with its estimated tokens; null when Nora cannot see its text. */
export interface ContextSectionTally { section: DirectContextSection; tokens: number | null; }
export interface ContextRequestTally {
  sections: readonly ContextSectionTally[];
  system: number;
  turn: number;
  /** Everything Nora can see and estimate. */
  visible: number;
  /** The best estimate of the whole next request. */
  next: number;
  /** True when `next` builds on what the provider measured for this thread, so it includes the hidden parts. */
  measured: boolean;
  window: number | null;
}
export type DirectContextState =
  | { status: "loading"; preview: DirectContextPreview | null }
  | { status: "ready"; preview: DirectContextPreview }
  | { status: "failed"; preview: DirectContextPreview | null; message: string };
export interface DirectContextQuery {
  chatId: string;
  draft: string;
  target: DirectContextTarget | null;
  /** Changes whenever the chat or its threads change, so the preview refreshes. */
  revision: string;
}
export interface ChatContextPanelProps {
  state: DirectContextState;
  target: DirectContextTarget | null;
  onTargetChange(target: DirectContextTarget | null): void;
  onRefresh(): void;
  onClose(): void;
}
export interface ChatContextRequestCardProps { request: DirectContextModelRequest; }
export interface ChatContextSectionProps { tally: ContextSectionTally; }
export interface ChatContextInspectorInput {
  /** The saved direct chat; null for group chats and chats not created yet. */
  chatId: string | null;
  draft: string;
  revision: string;
}
export interface ChatContextInspector {
  available: boolean;
  open: boolean;
  toggle(): void;
  close(): void;
  target: DirectContextTarget | null;
  setTarget(target: DirectContextTarget | null): void;
  state: DirectContextState;
  refresh(): void;
}
/** The header's toggle for the context panel; absent where the panel is unavailable. */
export interface ChatContextToggle { open: boolean; onToggle(): void; }
