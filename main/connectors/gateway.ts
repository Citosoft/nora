import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import type { ConnectorGateway, ConnectorGatewayOptions, StoredConnector } from "@main/types/connectors/connectors.types";

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

/**
 * Loopback-only reverse proxy between thread runtimes and connectors' Streamable HTTP servers. Runtimes authenticate to the gateway
 * with a per-launch token; the gateway adds the connector's real credentials, refreshing an OAuth token once when the server
 * rejects it, so tokens never reach provider runtimes, their config or their logs.
 */
export function createConnectorGateway({ store, credentials, onNeedsAuth, fetch: fetchFn = fetch }: ConnectorGatewayOptions): ConnectorGateway {
  const token = randomBytes(32).toString("base64url");
  let listening: Promise<{ server: Server; base: string }> | null = null;

  const authorized = (header: string | undefined): boolean => {
    const expected = Buffer.from(`Bearer ${token}`), actual = Buffer.from(header ?? "");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  };

  async function send(connector: StoredConnector, request: IncomingMessage, body: Buffer | undefined, signal: AbortSignal): Promise<Response | null> {
    let auth = await credentials(connector, { forceRefresh: false });
    for (let attempt = 0; auth; attempt += 1) {
      const upstream = await fetchFn(connector.url, { method: request.method ?? "GET", signal,
        headers: { ...forwardedHeaders(request), ...auth }, ...(body ? { body: new Uint8Array(body) } : {}) });
      if (upstream.status !== 401 || connector.auth.kind !== "oauth" || attempt > 0) return upstream;
      await upstream.body?.cancel();
      auth = await credentials(connector, { forceRefresh: true });
    }
    return null;
  }

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const path = request.url ?? "";
    const id = path.startsWith(PATH_PREFIX) ? decodeURIComponent(path.slice(PATH_PREFIX.length)) : "";
    if (!authorized(request.headers.authorization)) { reply(response, 401, "This runtime cannot use Nora's connectors"); return; }
    const connector = id ? store.get(id) : undefined;
    if (!connector?.enabled) { reply(response, 404, "This connector is not available"); return; }
    if (!ALLOWED_METHODS.has(request.method ?? "")) { reply(response, 405, "Method not allowed"); return; }
    const body = await readBody(request);
    const abort = new AbortController();
    response.on("close", () => abort.abort());
    const upstream = await send(connector, request, body, abort.signal);
    if (!upstream) {
      onNeedsAuth(connector.id);
      reply(response, 401, `${connector.name} needs you to sign in again in Nora's MCP Servers settings.`);
      return;
    }
    if (upstream.status === 401 && connector.auth.kind === "oauth") onNeedsAuth(connector.id);
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
    async endpoint(connector) {
      const { base } = await start();
      return { name: connector.serverName, url: `${base}${PATH_PREFIX}${encodeURIComponent(connector.id)}`, token };
    },
    async close() {
      const current = listening;
      listening = null;
      if (current) await current.then(({ server }) => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }), () => undefined);
    }
  };
}
