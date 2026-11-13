import { NORA_MCP_SERVER, NORA_TOOLS } from "@shared/nora-tools/catalog";
import type { NoraToolName } from "@shared/types/nora-tools/noraTools.types";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { NoraRunContext, NoraRunContextResolver, NoraToolEndpoint } from "@main/types/nora-tools/noraTools.types";

export const NORA_MCP_SERVER_NAME = NORA_MCP_SERVER;
/** Claude's qualified names for Nora's tools; they run without an approval prompt because they only act inside Nora. */
export const NORA_CLAUDE_TOOL_NAMES = (Object.keys(NORA_TOOLS) as NoraToolName[]).map((name) => `mcp__${NORA_MCP_SERVER_NAME}__${name}`);
/** ask_bot waits for another bot's whole turn, so runtimes must allow long tool calls. */
export const NORA_TOOL_TIMEOUT_SECONDS = 16 * 60;
const EMPTY: NoraRunContext = { tools: null, guidance: null };

/** Run additions are an enhancement: if they cannot be prepared, the turn still runs without them. */
export async function optionalRunContext(resolve: NoraRunContextResolver | undefined, conversation: Conversation): Promise<NoraRunContext> {
  if (!resolve) return EMPTY;
  try { return await resolve(conversation); }
  catch (error) { console.error("Nora's run context is unavailable for this turn", error); return EMPTY; }
}

export function joinGuidance(...parts: readonly (string | null | undefined)[]): string | undefined {
  const text = parts.filter((part): part is string => !!part?.trim()).join("\n\n");
  return text || undefined;
}

export function noraAuthorization(endpoint: NoraToolEndpoint): string { return `Bearer ${endpoint.token}`; }
