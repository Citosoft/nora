import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ExternalDiscoveryState, ExternalDiscoveryTarget, ExternalSessionsInput } from "@/components/app/types/externalSessions.types";

const EMPTY_STATE: ExternalDiscoveryState = { entries: [], loading: false, errors: [] };

export function useExternalSessions({ ports, workspaceId, enabled = true }: ExternalSessionsInput) {
  const { externalSessions: discovery, state: { boot, summaries } } = ports;
  const discovered = useSyncExternalStore(discovery.subscribe, discovery.snapshot);
  const targets = useMemo<ExternalDiscoveryTarget[]>(() => boot.workspaces
    .filter((workspace) => workspaceId === null || workspace.id === workspaceId)
    .flatMap((workspace) => boot.providers.filter((provider) => provider.kind === "codex" || provider.kind === "claude")
      .map((provider) => ({ workspace, provider: { kind: provider.kind, instanceId: provider.instanceId } }))), [boot.workspaces, boot.providers, workspaceId]);
  // Boot is replaced on every pushed change; ensure only scans workspaces or accounts it has not seen, so this never rescans.
  useEffect(() => { if (enabled) discovery.ensure(targets); }, [discovery, targets, enabled]);
  const refresh = useCallback(() => discovery.refresh(targets), [discovery, targets]);
  const state = enabled ? discovered : EMPTY_STATE;
  // A newly imported session disappears immediately, including imports from another open Nora window.
  const entries = useMemo(() => enabled ? discovered.entries.filter(({ session, workspaceId: entryWorkspace }) => (workspaceId === null || entryWorkspace === workspaceId)
    && !summaries.some(({ conversation }) => conversation.provider.kind === session.providerKind
      && conversation.provider.instanceId === session.instanceId && conversation.nativeConversationId === session.id)) : [], [enabled, discovered.entries, workspaceId, summaries]);
  return { ...state, entries, refresh };
}
