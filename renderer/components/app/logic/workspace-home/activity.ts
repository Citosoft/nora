import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";
import type { HomeActivity } from "@/components/app/types/workspace-home/home.types";

/** Per-section caps keep the home a glanceable summary; the sidebar always holds the full list. */
export const HOME_SECTION_LIMITS = { needsYou: 6, inProgress: 6, recent: 8 } as const;

const newestFirst = (a: ThreadNavigationRow, b: ThreadNavigationRow) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
const needsYou = (row: ThreadNavigationRow) => row.attention || Boolean(row.waitingOn);
const inProgress = (row: ThreadNavigationRow) => row.active || row.working;

/**
 * Splits a workspace's threads by what the user would do next: answer, check on, or resume.
 * Each thread lands in exactly one section; settled threads are left to the sidebar. Never alters sidebar ordering.
 * Threads in `answeredInline` (their own or a worker's request is answerable on the home) are left out, since the request stands in for them.
 */
export function buildHomeActivity(rows: readonly ThreadNavigationRow[], answeredInline: ReadonlySet<string> = new Set()): HomeActivity {
  const covered = (row: ThreadNavigationRow) => answeredInline.has(row.id) || (!!row.waitingOn && answeredInline.has(row.waitingOn.conversationId));
  const sorted = [...rows].sort(newestFirst);
  const inline = sorted.filter(covered).length;
  const waiting = sorted.filter((row) => needsYou(row) && !covered(row));
  const running = sorted.filter((row) => !needsYou(row) && !covered(row) && inProgress(row));
  const recent = sorted.filter((row) => !needsYou(row) && !covered(row) && !inProgress(row) && !row.settled);
  const sections = {
    needsYou: waiting.slice(0, HOME_SECTION_LIMITS.needsYou),
    inProgress: running.slice(0, HOME_SECTION_LIMITS.inProgress),
    recent: recent.slice(0, HOME_SECTION_LIMITS.recent)
  };
  return {
    ...sections,
    total: rows.length,
    hidden: rows.length - inline - sections.needsYou.length - sections.inProgress.length - sections.recent.length,
    unread: rows.filter((row) => row.unread).length
  };
}
