import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { McpLoginControls, McpLoginState, McpProviderSource, RuntimeMcpEntry, RuntimeMcpState } from "@/components/app/types/runtimeMcp.types";
import type { McpAction, McpResult } from "@shared/types/provider/mcp.types";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";

const LOADING: RuntimeMcpState = { status: "loading" };
const PENDING_LOGIN: McpLoginState = { status: "pending" };
const loginKey = (source: McpProviderSource, serverName: string) => `${source.key}\n${serverName}`;
/** Browser sign-in finishes outside Nora; returning to the window is the cue that it may have completed. */
const nextWindowFocus = () => new Promise<void>((resolve) => { window.addEventListener("focus", () => resolve(), { once: true }); });

/**
 * Discovers MCP servers from every provider runtime at once, tracking each provider's request independently.
 * Sign-in is tracked per server so a slow browser flow never clears the discovered list.
 */
export function useRuntimeMcpCatalog(client: Pick<ConversationClient, "mcp">, sources: readonly McpProviderSource[]) {
  const [snapshots, setSnapshots] = useState<ReadonlyMap<string, RuntimeMcpEntry>>(() => new Map());
  const [logins, setLogins] = useState<ReadonlyMap<string, McpLoginState>>(() => new Map());
  const sequences = useRef(new Map<string, number>());
  const send = useCallback((source: McpProviderSource, action: McpAction): Promise<McpResult> =>
    client.mcp({ ...source.selection, schemaVersion: 1, action }), [client]);
  /** Supersedes any in-flight request for the source and returns a check for whether this one is still current. */
  const claim = useCallback((source: McpProviderSource) => {
    const current = (sequences.current.get(source.key) ?? 0) + 1;
    sequences.current.set(source.key, current);
    return () => sequences.current.get(source.key) === current;
  }, []);
  const record = useCallback((source: McpProviderSource, state: RuntimeMcpState) =>
    setSnapshots((previous) => new Map(previous).set(source.key, { source, state })), []);
  const request = useCallback(async (source: McpProviderSource, action: Exclude<McpAction, { kind: "login" }>): Promise<void> => {
    const isCurrent = claim(source);
    record(source, LOADING);
    try {
      const result = await send(source, action);
      if (isCurrent()) record(source, { status: "loaded", result });
    } catch {
      if (isCurrent()) record(source, { status: "error", message: "MCP connections could not be loaded from this runtime. Check its configuration and refresh." });
    }
  }, [claim, record, send]);
  const setLogin = useCallback((key: string, state: McpLoginState | null) => setLogins((previous) => {
    const next = new Map(previous);
    if (state) next.set(key, state); else next.delete(key);
    return next;
  }), []);
  const startLogin = useCallback(async (source: McpProviderSource, serverName: string): Promise<void> => {
    const key = loginKey(source, serverName);
    setLogin(key, PENDING_LOGIN);
    try {
      const result = await send(source, { kind: "login", serverName });
      switch (result.kind) {
        case "unavailable": setLogin(key, { status: "failed", message: result.message }); return;
        // The runtime handed back an authorization URL; it completes the OAuth callback itself.
        case "login":
          await noraSystemClient.openExternalUrl(result.authorizationUrl);
          await nextWindowFocus();
          await request(source, { kind: "list" });
          break;
        // The runtime ran the browser flow to completion and re-read its servers.
        case "servers": claim(source); record(source, { status: "loaded", result }); break;
      }
      setLogin(key, null);
    } catch {
      setLogin(key, { status: "failed", message: "Sign-in could not be started from this runtime. Check its configuration and try again." });
    }
  }, [claim, record, request, send, setLogin]);
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
  const loginControls = useMemo<McpLoginControls>(() => ({
    state: (source, serverName) => logins.get(loginKey(source, serverName)),
    start: (source, serverName) => void startLogin(source, serverName)
  }), [logins, startLogin]);
  return { entries, refresh, logins: loginControls };
}
