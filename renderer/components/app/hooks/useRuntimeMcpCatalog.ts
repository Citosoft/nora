import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nativeConversationBridge } from "@/components/app/clients/nativeRuntimeClient";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { McpProviderSource, RuntimeMcpEntry, RuntimeMcpState } from "@/components/app/types/runtimeMcp.types";
import type { McpAction } from "@shared/types/provider/mcp.types";

const LOADING: RuntimeMcpState = { status: "loading" };

/** Discovers MCP servers from every provider runtime at once, tracking each provider's request independently. */
export function useRuntimeMcpCatalog(sources: readonly McpProviderSource[]) {
  const [snapshots, setSnapshots] = useState<ReadonlyMap<string, RuntimeMcpEntry>>(() => new Map());
  const sequences = useRef(new Map<string, number>());
  const request = useCallback(async (source: McpProviderSource, action: McpAction): Promise<void> => {
    const current = (sequences.current.get(source.key) ?? 0) + 1;
    sequences.current.set(source.key, current);
    const isCurrent = () => sequences.current.get(source.key) === current;
    const record = (state: RuntimeMcpState) => setSnapshots((previous) => new Map(previous).set(source.key, { source, state }));
    record(LOADING);
    try {
      const result = await nativeConversationBridge.mcp({ ...source.selection, schemaVersion: 1, action });
      if (!isCurrent()) return;
      if (result.kind === "login") await noraSystemClient.openExternalUrl(result.authorizationUrl);
      if (isCurrent()) record({ status: "loaded", result });
    } catch {
      if (isCurrent()) record({ status: "error", message: "MCP connections could not be loaded from this runtime. Check its configuration and refresh." });
    }
  }, []);
  useEffect(() => {
    const active = sequences.current;
    sources.forEach((source) => void request(source, { kind: "list" }));
    return () => sources.forEach((source) => active.set(source.key, (active.get(source.key) ?? 0) + 1));
  }, [sources, request]);
  // A snapshot recorded for a previous source (e.g. another workspace) is stale until its new request lands.
  const entries = useMemo<RuntimeMcpEntry[]>(() => sources.map((source) => {
    const snapshot = snapshots.get(source.key);
    return { source, state: snapshot?.source === source ? snapshot.state : LOADING };
  }), [sources, snapshots]);
  const refresh = useCallback(() => sources.forEach((source) => void request(source, { kind: "refresh" })), [sources, request]);
  const login = useCallback((source: McpProviderSource, serverName: string) => void request(source, { kind: "login", serverName }), [request]);
  return { entries, refresh, login };
}
