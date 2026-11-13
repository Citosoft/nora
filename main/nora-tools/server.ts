import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerNoraTools } from "./tools/index";
import type { NoraToolDeps, NoraToolServer } from "@main/types/nora-tools/noraTools.types";

const MCP_PATH = "/mcp";
const MAX_BODY_BYTES = 256 * 1024;

function readJson(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { reject(new Error("Request too large")); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined); } catch (error) { reject(error); } });
    request.on("error", reject);
  });
}

function reply(response: ServerResponse, status: number, message: string): void {
  if (!response.headersSent) response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));
}

/**
 * Loopback-only, stateless MCP endpoint. Each conversation gets its own bearer token, which is the only way a call
 * learns which thread (and workspace) it acts for; unknown tokens are refused.
 */
/** `onStarted` fires once the server is listening, so the window can show it as running. */
export function createNoraToolServer(deps: NoraToolDeps, onStarted?: () => void): NoraToolServer {
  const tokens = new Map<string, string>();
  const byConversation = new Map<string, string>();
  let listening: Promise<{ server: Server; url: string }> | null = null;
  let isRunning = false;

  const conversationFor = (header: string | undefined): string | null => {
    const presented = header?.startsWith("Bearer ") ? header.slice(7) : "";
    for (const [token, conversationId] of tokens) {
      const expected = Buffer.from(token), actual = Buffer.from(presented);
      if (expected.length === actual.length && timingSafeEqual(expected, actual)) return conversationId;
    }
    return null;
  };

  const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.url !== MCP_PATH) { reply(response, 404, "Not found"); return; }
    const conversationId = conversationFor(request.headers.authorization);
    const context = conversationId ? deps.context(conversationId) : null;
    if (!context) { reply(response, 401, "This thread cannot use Nora's tools"); return; }
    if (request.method !== "POST") { reply(response, 405, "Method not allowed"); return; }
    const server = new McpServer({ name: "nora", version: "1.0.0" });
    registerNoraTools(server, context, deps);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    response.on("close", () => { void transport.close(); void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(request, response, await readJson(request));
  };

  const start = (): Promise<{ server: Server; url: string }> => listening ??= new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      handle(request, response).catch((error: unknown) => {
        console.error("Nora tools request failed", error);
        reply(response, 500, "Nora could not complete that action.");
      });
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") { reject(new Error("Nora tools did not get a port")); return; }
      isRunning = true;
      resolve({ server, url: `http://127.0.0.1:${address.port}${MCP_PATH}` });
      onStarted?.();
    });
  });

  return {
    async resolve(conversation) {
      if (!deps.context(conversation.id)) return null;
      const { url } = await start();
      let token = byConversation.get(conversation.id);
      if (!token) {
        token = randomBytes(32).toString("base64url");
        tokens.set(token, conversation.id); byConversation.set(conversation.id, token);
      }
      return { url, token };
    },
    running: () => isRunning,
    async close() {
      const current = listening;
      listening = null; isRunning = false; tokens.clear(); byConversation.clear();
      if (current) await current.then(({ server }) => new Promise<void>((resolve) => server.close(() => resolve())), () => undefined);
    }
  };
}
