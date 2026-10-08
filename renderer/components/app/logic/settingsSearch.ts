import type { SettingsSearchEntry, SettingsSearchGroupResult, SettingsGroupItem } from "@/components/app/types/settingsSearch.types";

function tokenizeQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function matchesAllTokens(haystack: string, tokens: readonly string[]): boolean {
  return tokens.every((token) => haystack.includes(token));
}

function entryHaystack(entry: SettingsSearchEntry): string {
  return [entry.title, ...(entry.keywords ?? [])].join(" ").toLowerCase();
}

/**
 * Filters settings groups (in their sidebar order) to those whose label or settings match every query token.
 * Returns `null` for a blank query so callers can show the unfiltered navigation.
 */
export function searchSettings<TGroup extends Pick<SettingsGroupItem, "value" | "label">>(
  groups: readonly TGroup[],
  entries: readonly SettingsSearchEntry[],
  query: string
): SettingsSearchGroupResult<TGroup>[] | null {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return null;
  }

  return groups.flatMap((group) => {
    const matchingEntries = entries.filter(
      (entry) => entry.group === group.value && matchesAllTokens(entryHaystack(entry), tokens)
    );
    const labelMatches = matchesAllTokens(group.label.toLowerCase(), tokens);
    return labelMatches || matchingEntries.length > 0 ? [{ group, entries: matchingEntries }] : [];
  });
}

const SETTING_ANCHOR_ATTRIBUTE = "data-setting-anchor";

/** Marks a rendered setting so search results can scroll to it; `title` must match its search index entry. */
export function settingAnchorAttributes(title: string | undefined): { [SETTING_ANCHOR_ATTRIBUTE]?: string } {
  return title ? { [SETTING_ANCHOR_ATTRIBUTE]: title } : {};
}

export function findSettingAnchor(container: ParentNode, title: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[${SETTING_ANCHOR_ATTRIBUTE}="${CSS.escape(title)}"]`);
}
