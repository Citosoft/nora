import type { GatewaySessionBridge } from "@main/types/connectors/gatewaySession.types";

const JSON_HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream" } as const;

/**
 * A runtime that connected while its connector was signed out finished the handshake with Nora's stand-in, so it never got an
 * upstream session. Once signed in, the gateway opens one on its behalf and adds the session header to that runtime's calls.
 */
export function createSessionBridge(fetchFn: typeof fetch): GatewaySessionBridge {
  const sessions = new Map<string, string | null>();

  async function open(url: string, auth: Record<string, string>, protocolVersion: string, signal: AbortSignal): Promise<string | null | undefined> {
    const initialize = await fetchFn(url, { method: "POST", signal, headers: { ...JSON_HEADERS, ...auth },
      body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize",
        params: { protocolVersion, capabilities: {}, clientInfo: { name: "nora-gateway", version: "1.0.0" } } }) });
    await initialize.body?.cancel();
    // Not cached: a failed handshake (for example a rejected token) is tried again on the next call.
    if (!initialize.ok) return undefined;
    const sessionId = initialize.headers.get("mcp-session-id");
    if (!sessionId) return null;
    const initialized = await fetchFn(url, { method: "POST", signal,
      headers: { ...JSON_HEADERS, ...auth, "mcp-session-id": sessionId, "mcp-protocol-version": protocolVersion },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) });
    await initialized.body?.cancel();
    return sessionId;
  }

  return {
    async headersFor(key, connector, auth, protocolVersion, signal): Promise<Record<string, string>> {
      let sessionId = sessions.get(key);
      if (sessionId === undefined) {
        sessionId = await open(connector.url, auth, protocolVersion, signal);
        if (sessionId !== undefined) sessions.set(key, sessionId);
      }
      return sessionId ? { "mcp-session-id": sessionId } : {};
    },
    forget: (key) => { sessions.delete(key); },
    clear: () => sessions.clear()
  };
}
