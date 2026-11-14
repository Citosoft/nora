import type { ForgeWorkItemSummary } from "@shared/appTypes";
import type { ComposerEditorHandle } from "./composerEditor.types";
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
  inputRef: RefObject<ComposerEditorHandle | null>;
  value: string;
  disabled: boolean;
  placeholder: string;
  suggestion: PromptSuggestion | null;
  onFiles?(files: readonly File[]): void;
  onChange(text: string): void;
  onSubmit(): void;
  /** People the user can @mention here, such as a group chat's members; absent turns mentions off. */
  mentions?: readonly ComposerSuggestionOption[];
  issueSource?: ComposerIssueSource;
}
export interface ComposerSuggestionOption { id: string; name: string; detail?: string; icon: ReactNode; insertText?: string; }
export interface ComposerIssueSource { projectId: string; read(): Promise<ForgeWorkItemSummary[]>; }
export interface ComposerSuggestionsInput { value: string; caret: number; disabled: boolean; mentions?: readonly ComposerSuggestionOption[]; issueSource?: ComposerIssueSource; }
export interface ComposerToken extends ComposerTokenRange { trigger: "@" | "#"; }
export interface ComposerTokenRange { start: number; query: string; }
export interface ComposerInsertion { text: string; caret: number; }
export interface ComposerSuggestionListProps { label: string; message?: string; loading?: boolean; onRetry?(): void; id: string; options: readonly ComposerSuggestionOption[]; activeIndex: number; onPick(option: ComposerSuggestionOption): void; onHover(index: number): void; }
