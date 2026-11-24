import type { ThreadGroupPreview, ThreadListRow } from "@/components/app/types/thread-workspace/list.types";

/** Threads shown per group (or ungrouped list) before its Show more. */
export const THREAD_PREVIEW_LIMIT = 10;

/** Preserve the list's order while limiting all thread sources together. */
export function previewThreadGroup(rows: readonly ThreadListRow[], expanded: boolean, limit = THREAD_PREVIEW_LIMIT): ThreadGroupPreview {
  const limited = rows.length > limit;
  return expanded || !limited
    ? { rows: [...rows], hidden: 0, limited }
    : { rows: rows.slice(0, limit), hidden: rows.length - limit, limited };
}
