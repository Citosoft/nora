import type { RefObject } from "react";

export interface PromptSuggestion { runId: string; text: string; }
export interface ComposerKeyInput {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  composing: boolean;
  hasSuggestion: boolean;
}
export type ComposerKeyAction = "accept-suggestion" | "dismiss-suggestion" | "submit" | null;
export interface NativeComposerInputProps {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  disabled: boolean;
  placeholder: string;
  suggestion: PromptSuggestion | null;
  onChange(text: string): void;
  onSubmit(): void;
}
