import type { ComposerAttachments } from "./composerAttachments.types";
import type { IconName } from "./icon.types";
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
  /** Includes durable attachment references, using the desktop instruction format. */
  onSend: (instruction: string) => Promise<void>;
  placeholder?: string;
  /** Shown below the input (e.g. the project chip). */
  context?: ReactNode;
  attachments?: ComposerAttachments;
  stop?: ComposerStop | null;
  autoFocus?: boolean;
}

export interface ComposerActionProps {
  label: string;
  icon: IconName;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
  filled?: boolean;
}
