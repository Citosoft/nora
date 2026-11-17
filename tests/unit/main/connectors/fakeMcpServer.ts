import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

export interface FakeMcpServer {
  url: string;
  /** Access tokens the server currently accepts; clear it to make the next request fail as an expired token would. */
  validTokens: Set<string>;
  registrations: number;
  refreshes: number;
  /** Headers the MCP endpoint last received. */
  lastHeaders: IncomingMessage["headers"] | null;
  close(): Promise<void>;
}
export interface FakeMcpServerOptions { auth: "oauth" | "header" | "none"; headerValue?: string; }

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve) => { const chunks: Buffer[] = []; request.on("data", (chunk: Buffer) => chunks.push(chunk)); request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8"))); });
}
function json(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  response.writeHead(status, { "content-type": "application/json", ...headers }); response.end(JSON.stringify(body));
}

/**
 * A remote MCP server with a minimal OAuth 2.1 authorization server: protected resource and server metadata, dynamic client
 * registration, an authorization endpoint that approves at once, PKCE-checked code exchange and rotating refresh tokens.
 */
export async function startFakeMcpServer(options: FakeMcpServerOptions): Promise<FakeMcpServer> {
  let base = "";
  let sequence = 0;
  const codes = new Map<string, { challenge: string; redirectUri: string }>();
  const refreshTokens = new Set<string>();
  const state: FakeMcpServer = { url: "", validTokens: new Set(), registrations: 0, refreshes: 0, lastHeaders: null, close: async () => {} };
  const issue = () => {
    sequence += 1;
    const access = `access-${sequence}`, refresh = `refresh-${sequence}`;
    state.validTokens.add(access); refreshTokens.add(refresh);
    return { access_token: access, refresh_token: refresh, token_type: "Bearer", expires_in: 3600 };
  };
  const authorized = (request: IncomingMessage): boolean => {
    const header = request.headers.authorization ?? "";
    if (options.auth === "none") return true;
    if (options.auth === "header") return request.headers["x-api-key"] === options.headerValue;
    return header.startsWith("Bearer ") && state.validTokens.has(header.slice(7));
  };

  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", base);
      if (url.pathname.startsWith("/.well-known/oauth-protected-resource")) {
        json(response, 200, { resource: `${base}/mcp`, authorization_servers: [base] }); return;
      }
      if (url.pathname.startsWith("/.well-known/oauth-authorization-server")) {
        json(response, 200, { issuer: base, authorization_endpoint: `${base}/authorize`, token_endpoint: `${base}/token`,
          registration_endpoint: `${base}/register`, response_types_supported: ["code"], code_challenge_methods_supported: ["S256"],
          grant_types_supported: ["authorization_code", "refresh_token"], token_endpoint_auth_methods_supported: ["none"] }); return;
      }
      if (url.pathname === "/register") {
        state.registrations += 1;
        json(response, 201, { ...JSON.parse(await readBody(request)) as object, client_id: `client-${state.registrations}` }); return;
      }
      if (url.pathname === "/authorize") {
        const code = `code-${sequence + 1}`;
        const redirectUri = url.searchParams.get("redirect_uri") ?? "";
        codes.set(code, { challenge: url.searchParams.get("code_challenge") ?? "", redirectUri });
        const target = new URL(redirectUri);
        target.searchParams.set("code", code);
        target.searchParams.set("state", url.searchParams.get("state") ?? "");
        response.writeHead(302, { location: target.href }); response.end(); return;
      }
      if (url.pathname === "/token") {
        const form = new URLSearchParams(await readBody(request));
        if (form.get("grant_type") === "authorization_code") {
          const pending = codes.get(form.get("code") ?? "");
          const challenge = createHash("sha256").update(form.get("code_verifier") ?? "").digest("base64url");
          if (!pending || pending.challenge !== challenge || pending.redirectUri !== form.get("redirect_uri")) { json(response, 400, { error: "invalid_grant" }); return; }
          codes.delete(form.get("code") ?? "");
          json(response, 200, issue()); return;
        }
        const refresh = form.get("refresh_token") ?? "";
        if (!refreshTokens.delete(refresh)) { json(response, 400, { error: "invalid_grant" }); return; }
        state.refreshes += 1;
        json(response, 200, issue()); return;
      }
      if (url.pathname === "/mcp") {
        state.lastHeaders = request.headers;
        if (!authorized(request)) {
          json(response, 401, { error: "unauthorized" }, options.auth === "oauth"
            ? { "www-authenticate": `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"` } : {}); return;
        }
        if (request.method !== "POST") { json(response, 405, { error: "method not allowed" }); return; }
        const mcp = new McpServer({ name: "fake", version: "1.0.0", websiteUrl: "https://fake.example.com" });
        mcp.registerTool("echo", { description: "Echoes text", inputSchema: { text: z.string() } }, ({ text }) => ({ content: [{ type: "text", text }] }));
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        response.on("close", () => { void transport.close(); void mcp.close(); });
        await mcp.connect(transport);
        await transport.handleRequest(request, response, JSON.parse(await readBody(request)));
        return;
      }
      json(response, 404, { error: "not found" });
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  base = `http://127.0.0.1:${address.port}`;
  state.url = `${base}/mcp`;
  state.close = () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); });
  return state;
}
