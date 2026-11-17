import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function toolText(value: string, isError = false): CallToolResult {
  return { content: [{ type: "text", text: value }], ...(isError ? { isError } : {}) };
}

/** Expected failures carry user-meaningful messages; they reach the model as a tool error, never a crash. */
export async function runTool(action: () => Promise<string> | string): Promise<CallToolResult> {
  try { return toolText(await action()); }
  catch (cause) { return toolText(cause instanceof Error ? cause.message : "Nora could not complete that action.", true); }
}
