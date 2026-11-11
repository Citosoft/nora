import { useCallback, useEffect, useState } from "react";
import type { ExternalDiscoveryState, ExternalSessionsInput } from "@/components/app/types/externalSessions.types";

export function useExternalSessions({ ports, workspaceId, enabled = true }: ExternalSessionsInput) {
  const { client, state: { boot } } = ports;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<ExternalDiscoveryState>({ entries: [], loading: true, errors: [] });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const onFocus = (): void => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [refresh]);
  useEffect(() => {
    let disposed = false;
    if (!enabled) { setState({ entries: [], loading: false, errors: [] }); return; }
    setState({ entries: [], loading: true, errors: [] });
    const workspaces = boot.workspaces.filter((workspace) => workspaceId === null || workspace.id === workspaceId);
    const providers = boot.providers.filter((provider) => provider.kind === "codex" || provider.kind === "claude");
    void Promise.all(workspaces.flatMap((workspace) => providers.map(async (provider): Promise<ExternalDiscoveryState> => {
      try {
        const result = await client.externalSessions(provider.kind, provider.instanceId, workspace.workspace);
        return result.status === "available" ? { loading: false, errors: [], entries: result.sessions.map((session) => ({ session, workspaceId: workspace.id, workspaceName: workspace.name, workspacePath: workspace.workspace.path })) }
          : { entries: [], loading: false, errors: [result.message] };
      } catch (cause) { return { entries: [], loading: false, errors: [cause instanceof Error ? cause.message : "External sessions could not be loaded."] }; }
    }))).then((results) => {
      if (!disposed) setState({ loading: false, errors: [...new Set(results.flatMap((result) => result.errors))],
        entries: results.flatMap((result) => result.entries) });
    });
    return () => { disposed = true; };
  }, [client, boot.environmentId, boot.workspaces, boot.providers, workspaceId, revision, enabled]);
  // A newly imported session disappears immediately, including imports from another open Nora window.
  const entries = enabled ? state.entries.filter(({ session, workspaceId: entryWorkspace }) => (workspaceId === null || entryWorkspace === workspaceId) && !ports.state.summaries.some(({ conversation }) => conversation.provider.kind === session.providerKind
    && conversation.provider.instanceId === session.instanceId && conversation.nativeConversationId === session.id)) : [];
  return { ...state, entries, refresh };
}
