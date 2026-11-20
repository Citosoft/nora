import { NORA_MCP_SERVER, NORA_TOOLS } from "@shared/nora-tools/catalog";
import type { NoraToolName } from "@shared/types/nora-tools/noraTools.types";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { NoraRunContext, NoraRunContextResolver, RunMcpServer } from "@main/types/nora-tools/noraTools.types";

export const NORA_MCP_SERVER_NAME = NORA_MCP_SERVER;
/** Nora's tools run without a runtime approval prompt because they only act inside Nora; the one that runs a command (run_with_secrets) asks the user itself. */
const NORA_TOOL_NAMES: readonly string[] = Object.keys(NORA_TOOLS) as NoraToolName[];
/** ask_bot waits for another bot's whole turn, so runtimes must allow long tool calls. */
export const NORA_TOOL_TIMEOUT_SECONDS = 16 * 60;
const EMPTY: NoraRunContext = { tools: null, connectors: [], guidance: null, turnNotes: null };

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

/** The instruction a provider receives: this turn's note changes, if any, then the user's own words. */
export function instructionWithTurnNotes(instruction: string, context: Pick<NoraRunContext, "turnNotes">): string {
  return context.turnNotes ? `${context.turnNotes}\n\n${instruction}` : instruction;
}

export function mcpAuthorization(server: Pick<RunMcpServer, "token">): string { return `Bearer ${server.token}`; }

/** Every MCP server a run adds to its runtime: Nora's own tools first, then connectors. Each provider maps these to its own config. */
export function runMcpServers(context: Pick<NoraRunContext, "tools" | "connectors">): RunMcpServer[] {
  return [...(context.tools ? [{ name: NORA_MCP_SERVER_NAME, url: context.tools.url, token: context.tools.token,
    trustedTools: NORA_TOOL_NAMES, toolTimeoutSeconds: NORA_TOOL_TIMEOUT_SECONDS }] : []), ...context.connectors];
}

/** Read-only workflow threads receive exactly the authenticated reporting endpoint, never external connectors. */
export function workflowReviewMcpServers(context: Pick<NoraRunContext, "tools">): RunMcpServer[] {
  return context.tools ? [{ name: NORA_MCP_SERVER_NAME, url: context.tools.url, token: context.tools.token,
    trustedTools: ["report_workflow_stage"] }] : [];
}
