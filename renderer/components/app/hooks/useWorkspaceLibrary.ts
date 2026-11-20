import { useCallback, useEffect, useState } from "react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { buildLibraryEntries } from "@/components/app/logic/library/libraryEntries";
import type { LibraryLoadState } from "@/components/app/types/library.types";

/**
 * Loads every output across a workspace's threads while the Library is visible, and again whenever the window
 * regains focus or the user refreshes. Earlier entries stay on screen while a reload is in flight.
 */
export function useWorkspaceLibrary(shellProjectId: string, active: boolean): { state: LibraryLoadState; loading: boolean; refresh: () => void } {
  const native = useNativeRuntimePorts();
  const client = native.store.client;
  const projectId = native.boot.workspaces.find((workspace) => workspace.shellProjectId === shellProjectId)?.workspace.projectId ?? null;
  const [state, setState] = useState<LibraryLoadState>({ status: "loading" });
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!active) return;
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [active, refresh]);
  useEffect(() => {
    if (!active) return;
    if (!projectId) { setState({ status: "unavailable", message: "This workspace has no threads yet." }); return; }
    let current = true;
    setLoading(true);
    client.outputs(projectId).then((threads) => { if (current) setState({ status: "ready", entries: buildLibraryEntries(threads) }); },
      (error: unknown) => { if (current) setState({ status: "unavailable", message: error instanceof Error ? error.message : "The Library could not be loaded." }); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [active, client, projectId, revision]);
  return { state, loading, refresh };
}
