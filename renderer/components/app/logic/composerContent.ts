import { parseIssueReference } from "@/components/app/logic/forge-items/issueReference";
import type { ComposerInsertion, ComposerSuggestionOption } from "@/components/app/types/composerInput.types";
import type { ComposerHistory, ComposerPart } from "@/components/app/types/composerEditor.types";

/** Keep the serialized reference intact while projecting it as one non-editable inline token. */
export function splitComposerContent(value: string, mentions: readonly ComposerSuggestionOption[] = []): ComposerPart[] {
  const pattern = /\[(#[1-9]\d*)\]\((?:<([^<>\r\n]+)>|([^\s()]+))\s+"(nora-issue:(?:github|gitlab))"\)/g;
  const parts: ComposerPart[] = [];
  let offset = 0;
  for (const match of value.matchAll(pattern)) {
    const reference = parseIssueReference(match[2] ?? match[3], match[4], match[1]);
    if (!reference) continue;
    if (match.index > offset) parts.push({ kind: "text", source: value.slice(offset, match.index) });
    parts.push({ kind: "issue", source: match[0], reference });
    offset = match.index + match[0].length;
  }
  if (offset < value.length) parts.push({ kind: "text", source: value.slice(offset) });
  if (!mentions.length) return parts;
  return parts.flatMap((part) => part.kind === "text" ? splitMentionContent(part.source, mentions) : [part]);
}

/** Source positions inside a pill snap to an edge; the serialized tag cannot be partially edited. */
export function snapComposerOffset(value: string, offset: number, mentions: readonly ComposerSuggestionOption[] = []): number {
  const bounded = Math.max(0, Math.min(offset, value.length));
  let start = 0;
  for (const part of splitComposerContent(value, mentions)) {
    const end = start + part.source.length;
    if (part.kind !== "text" && bounded > start && bounded < end) return bounded - start < end - bounded ? start : end;
    start = end;
  }
  return bounded;
}

export function recordComposerHistory(history: ComposerHistory, value: string): ComposerHistory {
  if (history.values[history.index] === value) return history;
  const values = [...history.values.slice(0, history.index + 1), value].slice(-100);
  return { values, index: values.length - 1 };
}

export function moveComposerHistory(history: ComposerHistory, direction: -1 | 1): ComposerHistory {
  return { ...history, index: Math.max(0, Math.min(history.index + direction, history.values.length - 1)) };
}

export function deleteComposerReference(value: string, caret: number, direction: -1 | 1, mentions: readonly ComposerSuggestionOption[] = []): ComposerInsertion | null {
  let start = 0;
  for (const part of splitComposerContent(value, mentions)) {
    const end = start + part.source.length;
    if (part.kind !== "text" && caret === (direction === -1 ? end : start)) {
      return { text: value.slice(0, start) + value.slice(end), caret: start };
    }
    start = end;
  }
  return null;
}

/** Known names match longest-first; email addresses and partial names remain ordinary editable text. */
function splitMentionContent(value: string, mentions: readonly ComposerSuggestionOption[]): ComposerPart[] {
  const ordered = [...mentions].filter((mention) => mention.name.length > 0).sort((left, right) => right.name.length - left.name.length);
  const parts: ComposerPart[] = [];
  let offset = 0;
  for (let index = 0; index < value.length; index++) {
    if (value[index] !== "@" || (index > 0 && !/[\s([{]/.test(value[index - 1]))) continue;
    const mention = ordered.find((candidate) => {
      const end = index + candidate.name.length + 1;
      return value.slice(index + 1, end).toLocaleLowerCase() === candidate.name.toLocaleLowerCase()
        && (end === value.length || /[\s.,!?;:)\]}]/.test(value[end]));
    });
    if (!mention) continue;
    if (index > offset) parts.push({ kind: "text", source: value.slice(offset, index) });
    const end = index + mention.name.length + 1;
    parts.push({ kind: "mention", source: value.slice(index, end), mention });
    offset = end; index = end - 1;
  }
  if (offset < value.length) parts.push({ kind: "text", source: value.slice(offset) });
  return parts;
}

export function isCompletedComposerMention(value: string, caret: number, start: number, mentions: readonly ComposerSuggestionOption[]): boolean {
  let offset = 0;
  for (const part of splitComposerContent(value, mentions)) {
    const end = offset + part.source.length;
    if (part.kind === "mention" && offset === start && caret > end) return true;
    offset = end;
  }
  return false;
}
