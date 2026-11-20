import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { threadToolScope } from "@main/execution/toolScope";
import { registerAppTools, registerModelListTool } from "./app";
import { registerAppBuilderTools } from "./apps";
import { registerBotTools, registerBotListTool } from "./bots";
import { registerAskBotTool, registerChatTools, registerMemoryTools } from "./conversation";
import { registerSecretTools } from "./secrets";
import { registerTaskTools } from "./tasks";
import { registerThreadTools } from "./threads";
import { registerWorkflowTools, registerWorkflowReportTool } from "./workflows";
import { registerWorkerTools } from "./workers";

/**
 * Registers the tools for the calling thread's audience (see `audience` in the shared catalog). Every agent thread manages tasks,
 * keeps notes, uses saved secrets and reads past threads (bots see their own work). Nora and bots start and collect worker threads,
 * unless they are workers themselves. Nora also manages the app and workflows; bots read the chat they answer in.
 */
export function registerNoraTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  if (context.conversation.source?.kind === "workflow") {
    registerWorkflowReportTool(server, context, deps);
    // Reviewers only get the stage-report capability; app, memory-write and delegation tools cannot bypass read-only access.
    if (context.conversation.workspace.access === "read") return;
  }
  // An app's builder works through the app tools alone; secrets stay so a connector's key can be collected without passing through chat.
  if (threadToolScope(context.conversation) === "apps") { registerAppBuilderTools(server, context, deps); registerSecretTools(server, context, deps); return; }
  registerAskBotTool(server, context, deps);
  registerBotListTool(server, context, deps);
  registerModelListTool(server, context, deps);
  registerTaskTools(server, context, deps);
  registerMemoryTools(server, context, deps);
  registerSecretTools(server, context, deps);
  registerThreadTools(server, context, deps);
  // Both Nora and bots can track work; worker threads cannot recursively delegate.
  if (context.conversation.source?.kind !== "worker") registerWorkerTools(server, context, deps);
  if (context.audience === "bot") {
    if (context.chat) registerChatTools(server, context, deps);
    return;
  }
  registerBotTools(server, context, deps);
  registerAppTools(server, context, deps);
  registerAppBuilderTools(server, context, deps);
  registerWorkflowTools(server, context, deps);
}
