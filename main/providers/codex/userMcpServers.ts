import { z } from "zod";
import type { StdioRpc } from "./stdioRpc";

const configSchema = z.object({ config: z.object({ mcp_servers: z.record(z.string(), z.object({}).passthrough()).nullish() }) });

/** A scoped thread must not reach the user's own MCP servers: a read-only sandbox cannot restrict their side effects, and an app's builder gets only its connectors. */
export async function codexWithoutUserMcpServers(rpc: Pick<StdioRpc, "request">, cwd: string): Promise<Record<string, boolean>> {
  const { config } = await rpc.request("config/read", { cwd, includeLayers: false }, configSchema);
  return Object.fromEntries(Object.keys(config.mcp_servers ?? {}).map((name) => [`mcp_servers.${name}.enabled`, false]));
}
