import { z } from "zod";
import type { ThreadSort, ThreadSortEntry, ThreadSortOption } from "@/components/app/types/thread-workspace/list.types";

export const threadSortSchema = z.enum(["recent", "oldest", "title-asc", "title-desc"]);
export const threadSortOptions: readonly ThreadSortOption[] = [
  { id: "recent", label: "Recent activity" },
  { id: "oldest", label: "Oldest first" },
  { id: "title-asc", label: "Title A–Z" },
  { id: "title-desc", label: "Title Z–A" }
];

function activityTime(entry: ThreadSortEntry): number {
  const timestamp = Date.parse(entry.updatedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/** Shared by the merged list and the discovery preview so limiting never selects the wrong threads. */
export function compareThreadEntries(a: ThreadSortEntry, b: ThreadSortEntry, sort: ThreadSort): number {
  const recent = activityTime(b) - activityTime(a);
  switch (sort) {
    case "recent": return recent || a.id.localeCompare(b.id);
    case "oldest": return -recent || a.id.localeCompare(b.id);
    case "title-asc": return a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }) || recent || a.id.localeCompare(b.id);
    case "title-desc": return b.title.localeCompare(a.title, undefined, { sensitivity: "base", numeric: true }) || recent || a.id.localeCompare(b.id);
  }
}
