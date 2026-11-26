import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import type { ConnectorGateway, ConnectorGatewayOptions, StoredConnector } from "@main/types/connectors/connectors.types";
import type { GatewayCall, GatewayLocalReply } from "@main/types/connectors/gatewaySession.types";
import { createSessionBridge } from "./sessionBridge";
import { DEFAULT_MCP_PROTOCOL_VERSION, isSignInToolCall, parseRpcRequest, signedOutReply, signInToolReply, usesConnector } from "./signedOutSession";

const PATH_PREFIX = "/connectors/";
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const ALLOWED_METHODS = new Set(["GET", "POST", "DELETE"]);
/** Streamable HTTP headers a runtime sends that the upstream server needs; credentials are never taken from the runtime. */
const FORWARDED_REQUEST_HEADERS = ["accept", "content-type", "mcp-session-id", "mcp-protocol-version", "last-event-id"] as const;
/**
 * Response headers passed back. `www-authenticate` is withheld on purpose: Nora owns the sign-in, and a runtime that saw it would
 * try to run its own OAuth flow against the gateway.
 */
const FORWARDED_RESPONSE_HEADERS = ["content-type", "mcp-session-id", "cache-control"] as const;

function readBody(request: IncomingMessage): Promise<Buffer | undefined> {
  if (request.method !== "POST") return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { reject(new Error("Request too large")); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function reply(response: ServerResponse, status: number, message: string): void {
  if (!response.headersSent) response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));
}

function forwardedHeaders(request: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers[name];
    if (typeof value === "string") headers[name] = value;
  }
  return headers;
}

function headerValue(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return typeof value === "string" && value ? value : undefined;
}

function localReply(response: ServerResponse, { status, body }: GatewayLocalReply): void {
  if (body) response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
  else response.writeHead(status).end();
}

function parsePath(path: string): { conversationId: string; connectorId: string } | null {
  if (!path.startsWith(PATH_PREFIX)) return null;
  const parts = path.slice(PATH_PREFIX.length).split("/").filter(Boolean).map((part) => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  // /connectors/{conversationId}/{connectorId} — conversation scopes the authorize card to the waiting thread.
  if (parts.length === 2 && parts[0] && parts[1]) return { conversationId: parts[0], connectorId: parts[1] };
  // Legacy /connectors/{connectorId} — cannot wait on a thread card.
  if (parts.length === 1 && parts[0]) return { conversationId: "", connectorId: parts[0] };
  return null;
}

/**
 * Loopback-only reverse proxy between thread runtimes and connectors' Streamable HTTP servers. Runtimes authenticate to the gateway
 * with a per-launch token; the gateway adds the connector's real credentials, refreshing an OAuth token once when the server
 * rejects it, so tokens never reach provider runtimes, their config or their logs. When OAuth needs the user, a runtime's start-up
 * traffic is answered locally and only a call that uses the connector is held while a thread authorize prompt is open.
 */
export function createConnectorGateway({ store, credentials, onNeedsAuth, authPrompts, logoFor, toolsFor, fetch: fetchFn = fetch }: ConnectorGatewayOptions): ConnectorGateway {
  const sessions = createSessionBridge(fetchFn);
  const token = randomBytes(32).toString("base64url");
  let listening: Promise<{ server: Server; base: string }> | null = null;
  const conversationIdsByKey = new Map<string, readonly string[]>();

  const authorized = (header: string | undefined): boolean => {
    const expected = Buffer.from(`Bearer ${token}`), actual = Buffer.from(header ?? "");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  };

  /** Forwards with fresh credentials, refreshing an OAuth token once on 401; null when the connector needs a sign-in. */
  async function send(connector: StoredConnector, call: GatewayCall, signal: AbortSignal): Promise<Response | null> {
    let auth = await credentials(connector, { forceRefresh: false });
    for (let attempt = 0; auth; attempt += 1) {
      const session = call.bridged ? await sessions.headersFor(call.key, connector, auth, call.protocolVersion, signal) : {};
      const upstream = await fetchFn(connector.url, { method: call.request.method ?? "GET", signal,
        headers: { ...forwardedHeaders(call.request), ...session, ...auth }, ...(call.body ? { body: new Uint8Array(call.body) } : {}) });
      // A bridged session the server has since dropped is reopened once.
      if (upstream.status === 404 && session["mcp-session-id"] && attempt === 0) {
        await upstream.body?.cancel();
        sessions.forget(call.key);
        continue;
      }
      if (upstream.status !== 401 || connector.auth.kind !== "oauth" || attempt > 0) return upstream;
      await upstream.body?.cancel();
      auth = await credentials(connector, { forceRefresh: true });
    }
    return null;
  }

  async function waitForSignIn(connector: StoredConnector, conversationId: string, signal: AbortSignal): Promise<boolean> {
    if (!authPrompts || !conversationId || connector.auth.kind !== "oauth") return false;
    const conversationIds = conversationIdsByKey.get(`${conversationId}/${connector.id}`) ?? [conversationId];
    const logo = logoFor?.(connector.id);
    const outcome = await authPrompts.ask({
      conversationIds,
      connectorId: connector.id,
      connectorName: connector.name,
      serverName: connector.serverName,
      message: `${connector.name} needs you to authorize before this thread can use it.`,
      ...(logo ? { logo } : {})
    }, signal);
    return outcome.kind === "signed-in";
  }

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const path = request.url ?? "";
    const parsed = parsePath(path.split("?")[0] ?? path);
    if (!authorized(request.headers.authorization)) { reply(response, 401, "This runtime cannot use Nora's connectors"); return; }
    if (!parsed) { reply(response, 404, "This connector is not available"); return; }
    const connector = store.get(parsed.connectorId);
    if (!connector?.enabled) { reply(response, 404, "This connector is not available"); return; }
    if (!ALLOWED_METHODS.has(request.method ?? "")) { reply(response, 405, "Method not allowed"); return; }
    const body = await readBody(request);
    const rpc = parseRpcRequest(body);
    const call: GatewayCall = { request, body, key: `${parsed.conversationId}/${connector.id}`,
      protocolVersion: headerValue(request, "mcp-protocol-version") ?? DEFAULT_MCP_PROTOCOL_VERSION,
      // Calls without a session that are not a new handshake come from a runtime that connected while signed out.
      bridged: request.method === "POST" && !headerValue(request, "mcp-session-id") && rpc.messages.length > 0
        && !rpc.messages.some((message) => message.method === "initialize") };
    const abort = new AbortController();
    response.on("close", () => abort.abort());
    const tools = toolsFor?.(connector.id) ?? [];
    if (isSignInToolCall(rpc, tools)) {
      const secrets = store.secrets(connector.id);
      const signedIn = (!!secrets.tokens && !secrets.requiresSignIn) || await waitForSignIn(connector, parsed.conversationId, abort.signal);
      if (signedIn) localReply(response, signInToolReply(rpc, connector));
      else reply(response, 401, `${connector.name} needs you to sign in again in Nora.`);
      return;
    }
    let upstream = await send(connector, call, abort.signal);
    if (!upstream || (upstream.status === 401 && connector.auth.kind === "oauth")) {
      if (upstream) { await upstream.body?.cancel(); credentials.requireSignIn(connector); }
      sessions.forget(call.key);
      onNeedsAuth(connector.id);
      // Start-up traffic (handshake, tool listing) never prompts; only a call that needs the connector does.
      if (connector.auth.kind === "oauth" && !usesConnector(rpc)) {
        localReply(response, signedOutReply(request.method ?? "GET", rpc, connector, tools));
        return;
      }
      upstream = await waitForSignIn(connector, parsed.conversationId, abort.signal) ? await send(connector, call, abort.signal) : null;
      if (!upstream) {
        reply(response, 401, `${connector.name} needs you to sign in again in Nora.`);
        return;
      }
    }
    const headers: Record<string, string> = {};
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) headers[name] = value;
    }
    response.writeHead(upstream.status, headers);
    if (!upstream.body) { response.end(); return; }
    // Server-sent event streams stay open for the session, so the body is piped rather than buffered.
    Readable.fromWeb(upstream.body as WebReadableStream<Uint8Array>).on("error", () => response.destroy()).pipe(response);
  }

  const start = (): Promise<{ server: Server; base: string }> => listening ??= new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      handle(request, response).catch((error: unknown) => {
        if (!(error instanceof Error && error.name === "AbortError")) console.error("Connector request failed", error);
        reply(response, 502, "Nora could not reach this connector.");
      });
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") { reject(new Error("The connector gateway did not get a port")); return; }
      resolve({ server, base: `http://127.0.0.1:${address.port}` });
    });
  });

  return {
    async endpoint(connector, conversationIds = []) {
      const { base } = await start();
      const conversationId = conversationIds[0] ?? "";
      if (conversationId) conversationIdsByKey.set(`${conversationId}/${connector.id}`, conversationIds);
      const path = conversationId
        ? `${PATH_PREFIX}${encodeURIComponent(conversationId)}/${encodeURIComponent(connector.id)}`
        : `${PATH_PREFIX}${encodeURIComponent(connector.id)}`;
      return { name: connector.serverName, url: `${base}${path}`, token };
    },
    async close() {
      const current = listening;
      listening = null;
      conversationIdsByKey.clear();
      sessions.clear();
      if (current) await current.then(({ server }) => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }), () => undefined);
    }
  };
}
