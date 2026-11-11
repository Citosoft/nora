import type { ThreadListRow } from "@/components/app/types/thread-workspace/list.types";
import { useState } from "react";
import { useExternalSessions } from "./useExternalSessions";
import { buildExternalSessionList } from "@/components/app/logic/thread-workspace/externalSessionList";
import { buildResumableThreadRows, resumableThreadKey } from "@/components/app/logic/thread-workspace/listRows";
import type { ExternalSessionEntry, ResumableThreadsInput, ExternalThreadControlsState } from "@/components/app/types/externalSessions.types";

export function useResumableThreads({ ports, workspaceId, query, sourceFilter, sort, enabled = true }: ResumableThreadsInput) {
  const discovery = useExternalSessions({ ports, workspaceId, enabled });
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedScope, setExpandedScope] = useState<string | null>(null);
  const scope = workspaceId ?? "all";
  const expanded = expandedScope === scope;
  const { visible, hidden, total } = buildExternalSessionList({ entries: discovery.entries, query, expanded, sourceFilter, sort });
  const open = async (entry: ExternalSessionEntry): Promise<boolean> => {
    if (opening) return false;
    setOpening(resumableThreadKey(entry)); setError(null);
    try { await ports.resumeExternal(entry.workspaceId, entry.session); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The conversation could not be opened."); return false; }
    finally { setOpening(null); }
  };
  const setSettled = async (row: ThreadListRow, settled: boolean): Promise<void> => {
    if (opening || row.target.kind === "draft") return;
    setOpening(row.id); setError(null);
    try { await ports.setSettled(row.target, settled); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The thread could not be updated."); }
    finally { setOpening(null); }
  };
  const controls: ExternalThreadControlsState = {
    loading: enabled && discovery.loading, busy: opening !== null, expanded, hidden, total,
    errors: [...(enabled ? discovery.errors : []), ...(error ? [error] : [])], refresh: discovery.refresh,
    toggleExpanded: () => setExpandedScope(expanded ? null : scope)
  };
  return { rows: buildResumableThreadRows(visible, opening), open, setSettled, controls };
}
