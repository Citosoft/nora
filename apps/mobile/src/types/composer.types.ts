import type { ReactNode } from "react";

/** Replaces the send button with Stop while the agent works and the draft is empty (as in Claude and ChatGPT). */
export interface ComposerStop {
  onStop: () => void;
  busy: boolean;
  disabled: boolean;
}

export interface ComposerProps {
  disabledReason: string | null;
  draft: string;
  onDraftChange: (text: string) => void;
  onSend: (text: string) => Promise<void>;
  placeholder?: string;
  /** Shown in the composer's toolbar (e.g. the project chip). */
  context?: ReactNode;
  stop?: ComposerStop | null;
  autoFocus?: boolean;
}
