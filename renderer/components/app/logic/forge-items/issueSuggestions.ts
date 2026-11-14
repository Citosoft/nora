import type { ForgeWorkItemSummary } from "@shared/appTypes";

/** Exact numbers lead, followed by number prefixes and title matches, without reordering the source. */
export function matchWorkspaceIssues(items: readonly ForgeWorkItemSummary[], query: string): ForgeWorkItemSummary[] {
  const wanted = query.trim().toLocaleLowerCase();
  const tokens = wanted.split(/\s+/).filter(Boolean);
  const matches = items.filter((item) => {
    const text = `${item.number} ${item.title}`.toLocaleLowerCase();
    return tokens.every((token) => text.includes(token));
  });
  const rank = (item: ForgeWorkItemSummary): number => String(item.number) === wanted ? 0 : wanted && String(item.number).startsWith(wanted) ? 1 : 2;
  return matches.sort((left, right) => rank(left) - rank(right));
}
