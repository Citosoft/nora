import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { registerAppTools } from "./app";
import { registerBotTools, registerBotListTool } from "./bots";
import { registerAskBotTool, registerChatTools, registerMemoryTools } from "./conversation";
import { registerTaskTools } from "./tasks";
import { registerThreadTools } from "./threads";
import { registerWorkflowTools, registerWorkflowReportTool } from "./workflows";

/**
 * Registers the tools for the calling thread's audience (see `audience` in the shared catalog). Every agent thread manages tasks,
 * keeps notes and reads past threads (a bot only its own); Nora threads also manage the app and its workflows, and bots read the group or direct chat they answer in.
 */
export function registerNoraTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  if (context.conversation.source?.kind === "workflow") {
    registerWorkflowReportTool(server, context, deps);
    // Reviewers only get the stage-report capability; app, memory-write and delegation tools cannot bypass read-only access.
    if (context.conversation.workspace.access === "read") return;
  }
  registerAskBotTool(server, context, deps);
  registerBotListTool(server, context, deps);
  registerTaskTools(server, context, deps);
  registerMemoryTools(server, context, deps);
  registerThreadTools(server, context, deps);
  if (context.audience === "bot") {
    if (context.chat) registerChatTools(server, context, deps);
    return;
  }
  registerBotTools(server, context, deps);
  registerAppTools(server, context, deps);
  registerWorkflowTools(server, context, deps);
}
