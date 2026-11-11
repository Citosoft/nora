import { z } from "zod";
import type { McpAction, McpResult, McpServer } from "@shared/types/provider/mcp.types";
import { mcpResultSchema } from "@shared/providers/mcp";
import { threadSchema } from "./rpcSchemas";
import { CodexRpcError } from "./rpcError";
import type { StdioRpc } from "./stdioRpc";

const serverSchema = z.object({ name: z.string(),
  authStatus: z.enum(["unknown", "unsupported", "notLoggedIn", "bearerToken", "oAuth"]).catch("unknown"),
  runtimeStatus: z.enum(["notStarted", "starting", "connected", "authenticationRequired", "failed", "cancelled", "disabled"]).nullish(),
  tools: z.record(z.string(), z.object({ name: z.string(), description: z.string().optional() })),
  toolsError: z.string().nullish() });
const pageSchema = z.object({ data: z.array(serverSchema), nextCursor: z.string().nullish() });

export function normalizeCodexMcp(input: unknown): McpServer {
  const server = serverSchema.parse(input);
  const status: McpServer["status"] = server.runtimeStatus === "authenticationRequired" ? "needs-auth"
    : server.runtimeStatus === "notStarted" || server.runtimeStatus === "starting" ? "pending"
    : server.runtimeStatus === "cancelled" ? "failed"
    : server.runtimeStatus ?? (server.authStatus === "notLoggedIn" ? "needs-auth" : "unknown");
  return { name: server.name, status,
    authStatus: server.authStatus === "notLoggedIn" ? "needs-auth"
      : server.authStatus === "bearerToken" || server.authStatus === "oAuth" ? "authenticated" : server.authStatus,
    canLogin: server.authStatus === "notLoggedIn", tools: Object.values(server.tools),
    ...(server.toolsError || status === "failed" ? { message: "The runtime could not discover this server's tools. Check its configuration and authentication, then refresh." } : {}) };
}

/** Ephemeral, prompt-free threads resolve project config without creating Nora conversations. */
export class CodexMcpDiscovery {
  private readonly threads = new Map<string, Promise<string>>();
  constructor(private readonly rpc: StdioRpc) {}

  private thread(cwd: string): Promise<string> {
    const existing = this.threads.get(cwd);
    if (existing) return existing;
    const pending = this.rpc.request("thread/start", { cwd, ephemeral: true,
      approvalPolicy: "on-request", sandbox: "read-only" }, threadSchema).then((result) => result.thread.id);
    this.threads.set(cwd, pending);
    void pending.catch(() => { if (this.threads.get(cwd) === pending) this.threads.delete(cwd); });
    return pending;
  }

  async request(cwd: string, action: McpAction): Promise<McpResult> {
    try {
      const threadId = await this.thread(cwd);
      if (action.kind === "login") {
        const server = (await this.list(threadId)).find((entry) => entry.name === action.serverName);
        if (!server?.canLogin) return { kind: "unavailable", message: "This server does not currently offer runtime OAuth sign-in. Refresh its status or configure authentication in Codex." };
        const result = await this.rpc.request("mcpServer/oauth/login", { name: action.serverName, threadId },
          z.object({ authorizationUrl: z.string() }));
        return mcpResultSchema.parse({ kind: "login", authorizationUrl: result.authorizationUrl });
      }
      if (action.kind === "refresh") await this.rpc.request("config/mcpServer/reload", {}, z.object({}));
      return { kind: "servers", servers: await this.list(threadId) };
    } catch (error) {
      return { kind: "unavailable", message: error instanceof CodexRpcError && error.code === -32601
        ? "This Codex runtime does not support the requested MCP operation. Update Codex and try again."
        : "Codex MCP discovery is unavailable. Check the runtime, its MCP configuration and authentication, then refresh." };
    }
  }

  private async list(threadId: string): Promise<McpServer[]> {
    const servers: McpServer[] = [];
    const cursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const page: z.infer<typeof pageSchema> = await this.rpc.request("mcpServerStatus/list", { threadId, cursor, limit: 100, detail: "toolsAndAuthOnly" }, pageSchema);
      servers.push(...page.data.map(normalizeCodexMcp));
      cursor = page.nextCursor ?? null;
      if (cursor && (cursors.has(cursor) || cursors.size >= 100)) throw new Error("Invalid MCP pagination");
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return servers;
  }
}
