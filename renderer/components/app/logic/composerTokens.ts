import type { ComposerTokenRange, ComposerToken, ComposerSuggestionOption, ComposerInsertion } from "@/components/app/types/composerInput.types";

const QUERY_MAX = 40;

/** Options whose name starts with the query come first, then names containing it; a query with a space must match a name with one. */
export function matchMentions(options: readonly ComposerSuggestionOption[], query: string): ComposerSuggestionOption[] {
  const wanted = query.toLocaleLowerCase();
  const name = (option: ComposerSuggestionOption): string => option.name.toLocaleLowerCase();
  return [...options.filter((option) => name(option).startsWith(wanted)),
    ...options.filter((option) => !name(option).startsWith(wanted) && name(option).includes(wanted))];
}

/** Only a token at a word boundary may open suggestions; completed references and URLs cannot. */
export function activeComposerToken(text: string, caret: number, trigger: "@" | "#"): ComposerToken | null {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf(trigger);
  if (start < 0 || caret - start - 1 > QUERY_MAX) return null;
  if (start > 0 && !/[\s([{]/.test(before[start - 1])) return null;
  const query = before.slice(start + 1);
  if (trigger === "#" ? /[\r\n@#()[\]<>`"]/.test(query) : /[\r\n]/.test(query)) return null;
  return { start, query, trigger };
}

export function insertComposerToken(text: string, token: ComposerTokenRange, caret: number, inserted: string): ComposerInsertion {
  const after = text.slice(caret).replace(/^ /, "");
  return { text: `${text.slice(0, token.start)}${inserted} ${after}`, caret: token.start + inserted.length + 1 };
}
