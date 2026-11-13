import type { ActiveMention, ComposerMentionOption, MentionInsertion } from "@/components/app/types/composerInput.types";

const QUERY_MAX = 40;

/**
 * The @-mention being typed at the caret: an `@` at the start or after whitespace or an opening bracket, followed by the query up to the caret.
 * Queries may contain spaces (bot names can) but not line breaks.
 */
export function activeMention(text: string, caret: number): ActiveMention | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0 || caret - at - 1 > QUERY_MAX) return null;
  if (at > 0 && !/[\s([{]/.test(before[at - 1])) return null;
  const query = before.slice(at + 1);
  return /[\r\n]/.test(query) ? null : { start: at, query };
}

/** Options whose name starts with the query come first, then names containing it; a query with a space must match a name with one. */
export function matchMentions(options: readonly ComposerMentionOption[], query: string): ComposerMentionOption[] {
  const wanted = query.toLocaleLowerCase();
  const name = (option: ComposerMentionOption): string => option.name.toLocaleLowerCase();
  return [...options.filter((option) => name(option).startsWith(wanted)),
    ...options.filter((option) => !name(option).startsWith(wanted) && name(option).includes(wanted))];
}

/** Replaces `@query` with `@Name ` and puts the caret after the space. */
export function insertMention(text: string, mention: ActiveMention, caret: number, name: string): MentionInsertion {
  const inserted = `@${name} `;
  const after = text.slice(caret).replace(/^ /, "");
  return { text: `${text.slice(0, mention.start)}${inserted}${after}`, caret: mention.start + inserted.length };
}
