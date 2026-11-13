import { z } from "zod";
import type { StdioRpc } from "./stdioRpc";

const effectiveConfigSchema = z.object({ config: z.object({ tool_output_token_limit: z.number().int().positive().nullish() }) });

/** Preserve a stricter user budget. Older runtimes retain native defaults if effective config cannot be read. */
export async function codexOutputConfig(rpc: Pick<StdioRpc, "request">, cwd: string, enabled: boolean): Promise<Record<string, number>> {
  if (!enabled) return {};
  try {
    const { config } = await rpc.request("config/read", { cwd, includeLayers: false }, effectiveConfigSchema);
    return { tool_output_token_limit: Math.min(config.tool_output_token_limit ?? 2_000, 2_000) };
  } catch { return {}; }
}
