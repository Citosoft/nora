import { z } from "zod";
import type { StdioRpc } from "./stdioRpc";

const configSchema = z.object({ config: z.object({ mcp_servers: z.record(z.string(), z.object({}).passthrough()).nullish() }) });

/** A read-only filesystem sandbox cannot restrict side effects in external MCP servers. Disable those per thread too. */
export async function codexReadOnlyConfig(rpc: Pick<StdioRpc, "request">, cwd: string): Promise<Record<string, boolean>> {
  const { config } = await rpc.request("config/read", { cwd, includeLayers: false }, configSchema);
  return Object.fromEntries(Object.keys(config.mcp_servers ?? {}).map((name) => [`mcp_servers.${name}.enabled`, false]));
}
