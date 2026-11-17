import { z } from "zod";
import type { McpAction, McpResult, McpServer } from "@shared/types/provider/mcp.types";
import type { CodexMcpOrigins } from "@main/types/execution/codex.types";
import { mcpResultSchema } from "@shared/providers/mcp";
import { resolveMcpServerLogo } from "@main/providers/mcpLogo";
import { threadSchema } from "./rpcSchemas";
import { CodexRpcError } from "./rpcError";
import type { StdioRpc } from "./stdioRpc";

const serverSchema = z.object({ name: z.string(),
  authStatus: z.enum(["unknown", "unsupported", "notLoggedIn", "bearerToken", "oAuth"]).catch("unknown"),
  runtimeStatus: z.enum(["notStarted", "starting", "connected", "authenticationRequired", "failed", "cancelled", "disabled"]).nullish(),
  pluginId: z.string().nullish(),
  httpOrigin: z.string().nullish(),
  serverInfo: z.unknown().optional(),
  tools: z.record(z.string(), z.object({ name: z.string(), description: z.string().optional() })),
  toolsError: z.string().nullish() });
const pageSchema = z.object({ data: z.array(serverSchema), nextCursor: z.string().nullish() });
const configOriginsSchema = z.object({ origins: z.record(z.string(), z.object({ name: z.object({ type: z.string() }) })) });

/**
 * Plugin servers are global. Configured servers take the layer their `mcp_servers.<name>.*` keys come from
 * (`project` layers belong to the workspace); servers with no config keys are runtime built-ins and therefore global.
 */
export function codexMcpScope(name: string, pluginId: string | null | undefined, origins: CodexMcpOrigins | null): McpServer["scope"] {
  if (pluginId) return "global";
  if (!origins) return "unknown";
  const prefix = `mcp_servers.${name}.`;
  const layers = Object.entries(origins).filter(([key]) => key.startsWith(prefix)).map(([, layer]) => layer);
  return layers.includes("project") ? "workspace" : "global";
}

export function normalizeCodexMcp(input: unknown, origins: CodexMcpOrigins | null): McpServer {
  const server = serverSchema.parse(input);
  const logo = resolveMcpServerLogo({ serverInfo: server.serverInfo, endpointUrl: server.httpOrigin });
  const status: McpServer["status"] = server.runtimeStatus === "authenticationRequired" ? "needs-auth"
    : server.runtimeStatus === "notStarted" || server.runtimeStatus === "starting" ? "pending"
    : server.runtimeStatus === "cancelled" ? "failed"
    : server.runtimeStatus ?? (server.authStatus === "notLoggedIn" ? "needs-auth" : "unknown");
  return { name: server.name, status,
    authStatus: server.authStatus === "notLoggedIn" ? "needs-auth"
      : server.authStatus === "bearerToken" || server.authStatus === "oAuth" ? "authenticated" : server.authStatus,
    canLogin: server.authStatus === "notLoggedIn", scope: codexMcpScope(server.name, server.pluginId, origins),
    tools: Object.values(server.tools), ...(logo ? { logo } : {}),
    ...(server.toolsError || status === "failed" ? { message: "The runtime could not discover this server's tools. Check its configuration and authentication, then refresh." } : {}) };
}

/**
 * Ephemeral, prompt-free threads resolve project config without creating Nora conversations.
 * Without a workspace, requests use no thread so only the runtime's global config applies.
 */
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

  async request(cwd: string | null, action: McpAction): Promise<McpResult> {
    try {
      const threadId = cwd ? await this.thread(cwd) : null;
      if (action.kind === "login") {
        const server = (await this.list(threadId, null)).find((entry) => entry.name === action.serverName);
        if (!server?.canLogin) return { kind: "unavailable", message: "This server does not currently offer runtime OAuth sign-in. Refresh its status or configure authentication in Codex." };
        const result = await this.rpc.request("mcpServer/oauth/login", { name: action.serverName, ...(threadId ? { threadId } : {}) },
          z.object({ authorizationUrl: z.string() }));
        return mcpResultSchema.parse({ kind: "login", authorizationUrl: result.authorizationUrl });
      }
      if (action.kind === "refresh") await this.rpc.request("config/mcpServer/reload", {}, z.object({}));
      return { kind: "servers", servers: await this.list(threadId, await this.origins(cwd)) };
    } catch (error) {
      return { kind: "unavailable", message: error instanceof CodexRpcError && error.code === -32601
        ? "This Codex runtime does not support the requested MCP operation. Update Codex and try again."
        : "Codex MCP discovery is unavailable. Check the runtime, its MCP configuration and authentication, then refresh." };
    }
  }

  /** Config layer per key, used only to label scope; older runtimes without `config/read` leave scope unknown. */
  private async origins(cwd: string | null): Promise<CodexMcpOrigins | null> {
    try {
      const { origins } = await this.rpc.request("config/read", cwd ? { cwd } : {}, configOriginsSchema);
      return Object.fromEntries(Object.entries(origins).filter(([key]) => key.startsWith("mcp_servers."))
        .map(([key, metadata]) => [key, metadata.name.type]));
    } catch { return null; }
  }

  private async list(threadId: string | null, origins: CodexMcpOrigins | null): Promise<McpServer[]> {
    const servers: McpServer[] = [];
    const cursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const page: z.infer<typeof pageSchema> = await this.rpc.request("mcpServerStatus/list", { threadId, cursor, limit: 100, detail: "toolsAndAuthOnly" }, pageSchema);
      servers.push(...page.data.map((entry) => normalizeCodexMcp(entry, origins)));
      cursor = page.nextCursor ?? null;
      if (cursor && (cursors.has(cursor) || cursors.size >= 100)) throw new Error("Invalid MCP pagination");
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return servers;
  }
}
