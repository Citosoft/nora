import { compareThreadEntries } from "./sorting";
import { matchesThreadSource } from "./sources";
import type { ExternalSessionEntry } from "@/components/app/types/externalSessions.types";
import type { ResumableThreadBusy, ResumableThreadRow, ThreadListRow, ThreadSourceFilter, ThreadSort } from "@/components/app/types/thread-workspace/list.types";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

export function resumableThreadKey(entry: ExternalSessionEntry): string {
  return JSON.stringify([entry.session.providerKind, entry.session.instanceId, entry.session.id]);
}

export function buildResumableThreadRows(entries: readonly ExternalSessionEntry[], busy: ResumableThreadBusy | null): ResumableThreadRow[] {
  return entries.map((entry) => ({
    id: `external:${resumableThreadKey(entry)}`,
    target: { kind: "external", entry, pending: busy?.key === resumableThreadKey(entry) ? busy.action : null, disabled: busy !== null },
    title: entry.session.title, workspaceId: entry.workspaceId, providerKind: entry.session.providerKind, origin: entry.session.origin,
    status: "Ready", active: false, working: false, unread: false, attention: false, pinned: false, selected: false, hasDraft: false,
    queuedCount: 0, updatedAt: entry.session.updatedAt
  }));
}

export function mergeThreadRows(stored: readonly ThreadNavigationRow[], resumable: readonly ResumableThreadRow[], source: ThreadSourceFilter, sort: ThreadSort = "recent"): ThreadListRow[] {
  return [...stored, ...resumable].filter((row) => matchesThreadSource(row, source))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || compareThreadEntries(a, b, sort));
}
