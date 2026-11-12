import type { ResumableThreadAction, ResumableThreadBusy, ThreadListRow } from "@/components/app/types/thread-workspace/list.types";
import { useState } from "react";
import { useExternalSessions } from "./useExternalSessions";
import { buildExternalSessionList } from "@/components/app/logic/thread-workspace/externalSessionList";
import { buildResumableThreadRows, resumableThreadKey } from "@/components/app/logic/thread-workspace/listRows";
import type { ExternalSessionEntry, ResumableThreadsInput, ExternalThreadControlsState } from "@/components/app/types/externalSessions.types";

export function useResumableThreads({ ports, workspaceId, query, sourceFilter, sort, enabled = true }: ResumableThreadsInput) {
  const discovery = useExternalSessions({ ports, workspaceId, enabled });
  const [busy, setBusy] = useState<ResumableThreadBusy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedScope, setExpandedScope] = useState<string | null>(null);
  const scope = workspaceId ?? "all";
  const expanded = expandedScope === scope;
  const { visible, hidden, total } = buildExternalSessionList({ entries: discovery.entries, query, expanded, sourceFilter, sort });
  /** One import at a time: open, pin and settle all create the same Nora conversation. */
  const run = async (key: string, action: ResumableThreadAction, work: () => Promise<void>, failure: string): Promise<boolean> => {
    if (busy) return false;
    setBusy({ key, action }); setError(null);
    try { await work(); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : failure); return false; }
    finally { setBusy(null); }
  };
  const open = (entry: ExternalSessionEntry): Promise<boolean> =>
    run(resumableThreadKey(entry), "open", () => ports.resumeExternal(entry.workspaceId, entry.session), "The conversation could not be opened.");
  const pin = (entry: ExternalSessionEntry): Promise<boolean> =>
    run(resumableThreadKey(entry), "pin", () => ports.pinExternal(entry.workspaceId, entry.session), "The conversation could not be pinned.");
  const setSettled = async (row: ThreadListRow, settled: boolean): Promise<void> => {
    if (row.target.kind === "draft") return;
    const { target } = row;
    await run(target.kind === "external" ? resumableThreadKey(target.entry) : row.id, "settle", () => ports.setSettled(target, settled), "The thread could not be updated.");
  };
  const controls: ExternalThreadControlsState = {
    loading: enabled && discovery.loading, busy: busy !== null, expanded, hidden, total,
    errors: [...(enabled ? discovery.errors : []), ...(error ? [error] : [])], refresh: discovery.refresh,
    toggleExpanded: () => setExpandedScope(expanded ? null : scope)
  };
  return { rows: buildResumableThreadRows(visible, busy), open, pin, setSettled, controls };
}
