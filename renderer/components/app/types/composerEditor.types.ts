import type { HTMLAttributes, RefObject } from "react";
import type { ComposerSuggestionOption } from "./composerInput.types";
import type { IssueReference } from "./forge-items/issue.types";

export type ComposerPart =
  | { kind: "text"; source: string }
  | { kind: "issue"; source: string; reference: IssueReference }
  | { kind: "mention"; source: string; mention: ComposerSuggestionOption };
export interface ComposerEditorHandle { focus(): void; setSelectionRange(start: number, end: number): void; }
export interface ComposerPillHost { element: HTMLSpanElement; part: Exclude<ComposerPart, { kind: "text" }>; }
export interface ComposerEditorProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "onInput" | "onPaste"> {
  inputRef: RefObject<ComposerEditorHandle | null>;
  value: string;
  disabled: boolean;
  placeholder: string;
  onValueChange(value: string, caret: number): void;
  onCaretChange(caret: number): void;
  onFiles?(files: readonly File[]): void;
  mentions?: readonly ComposerSuggestionOption[];
}

export interface ComposerHistory { values: string[]; index: number; }
