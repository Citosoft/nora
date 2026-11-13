import type { ReactNode, RefObject } from "react";

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
  trailingAction?: ReactNode;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  disabled: boolean;
  placeholder: string;
  suggestion: PromptSuggestion | null;
  onFiles?(files: readonly File[]): void;
  onChange(text: string): void;
  onSubmit(): void;
  /** People the user can @mention here, such as a group chat's members; absent turns mentions off. */
  mentions?: readonly ComposerMentionOption[];
}
export interface ComposerMentionOption { id: string; name: string; detail?: string; icon: ReactNode; }
export interface ActiveMention { start: number; query: string; }
export interface MentionInsertion { text: string; caret: number; }
export interface ComposerMentionListProps { id: string; options: readonly ComposerMentionOption[]; activeIndex: number; onPick(option: ComposerMentionOption): void; onHover(index: number): void; }
