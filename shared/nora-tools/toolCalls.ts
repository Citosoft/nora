import { NORA_MCP_SERVER } from "./catalog";
import type { NoraToolName } from "@shared/types/nora-tools/noraTools.types";

/** How runtimes name a Nora tool call: Claude qualifies it with the server, Codex reports the bare tool name and the server separately. */
export function isNoraToolCall(name: NoraToolName, label: string, server: string | undefined): boolean {
  return label === `mcp__${NORA_MCP_SERVER}__${name}` || (label === name && server === NORA_MCP_SERVER);
}
