import type { ForgeWorkItemKind, ForgeWorkItemFileChange, ForgeWorkItemSummary } from "@shared/appTypes";
import type { ItemGroup, ItemListOptions } from "@/components/app/types/forge-items/list.types";
import type { DiffLineCounts } from "@shared/types/conversation/diff.types";

export function isDraftRequest(item: ForgeWorkItemSummary): boolean {
  return item.draft ?? (item.state.toLowerCase() === "draft" || /^(draft|wip)\s*:/i.test(item.title));
}

export function groupForgeItems(items: readonly ForgeWorkItemSummary[], kind: ForgeWorkItemKind = "pull_request"): ItemGroup[] {
  if (kind === "issue") return items.length ? [{ id: "open", label: "Open issues", items: [...items] }] : [];
  const open: ItemGroup = { id: "open", label: "Open requests", items: [] };
  const drafts: ItemGroup = { id: "draft", label: "Drafts", items: [] };
  for (const item of items) (isDraftRequest(item) ? drafts : open).items.push(item);
  return [open, drafts].filter((group) => group.items.length > 0);
}

export function requestChangeCounts(changes: readonly ForgeWorkItemFileChange[]): DiffLineCounts {
  return changes.reduce<DiffLineCounts>((counts, change) => ({
    additions: counts.additions + change.additions,
    deletions: counts.deletions + change.deletions
  }), { additions: 0, deletions: 0 });
}

export function selectForgeItems(items: readonly ForgeWorkItemSummary[], options: ItemListOptions, kind: ForgeWorkItemKind = "pull_request"): ForgeWorkItemSummary[] {
  const tokens = options.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (kind === "pull_request" && options.filter === "draft" && !isDraftRequest(item)) return false;
    if (kind === "pull_request" && options.filter === "ready" && isDraftRequest(item)) return false;
    const text = [item.title, String(item.number), `#${item.number}`, `!${item.number}`, item.author, item.sourceBranch, item.targetBranch].join(" ").toLowerCase();
    return tokens.every((token) => text.includes(token));
  }).sort((left, right) => {
    if (options.sort === "title") return left.title.localeCompare(right.title) || right.number - left.number;
    if (options.sort === "newest") return right.number - left.number;
    const leftTime = Date.parse(left.updatedAt), rightTime = Date.parse(right.updatedAt);
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0) || right.number - left.number;
  });
}
