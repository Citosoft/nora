import type { ThreadGroupPreview, ThreadListRow } from "@/components/app/types/thread-workspace/list.types";

/** Resumable threads from other tools shown per group before its Show more. */
export const RESUMABLE_PREVIEW_LIMIT = 5;

/** Nora threads always show; a group's resumable threads beyond the limit wait behind its own Show more, keeping the group's order. */
export function previewThreadGroup(rows: readonly ThreadListRow[], expanded: boolean, limit = RESUMABLE_PREVIEW_LIMIT): ThreadGroupPreview {
  const resumable = rows.filter((row) => row.target.kind === "external").length;
  const limited = resumable > limit;
  if (expanded || !limited) return { rows: [...rows], hidden: 0, limited };
  let shown = 0;
  const visible = rows.filter((row) => row.target.kind !== "external" || shown++ < limit);
  return { rows: visible, hidden: resumable - limit, limited };
}
