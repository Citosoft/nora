import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";
import type { HomeActivity } from "@/components/app/types/workspace-home/home.types";

/** Keep actionable work visible before pins and recency; never alter sidebar ordering. */
export function buildHomeActivity(rows: readonly ThreadNavigationRow[]): HomeActivity {
  return {
    total: rows.length,
    active: rows.filter((row) => row.active).length,
    attention: rows.filter((row) => row.attention).length,
    unread: rows.filter((row) => row.unread).length,
    recent: [...rows].sort((a, b) => Number(b.attention) - Number(a.attention)
      || Number(b.unread) - Number(a.unread) || Number(b.active) - Number(a.active)
      || Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)).slice(0, 4)
  };
}
