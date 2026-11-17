import { z } from "zod";
import { CodexRpcError } from "./rpcError";
import type { StdioRpc } from "./stdioRpc";

/** Missing required arguments validate method availability without addressing a thread or sending input. */
export async function supportsCodexSteering(rpc: StdioRpc): Promise<boolean> {
  try { await rpc.request("turn/steer", {}, z.json()); return false; }
  catch (error) { return error instanceof CodexRpcError && error.invalidParameters; }
}

export const steerResultSchema = z.object({ turnId: z.string().min(1) });
