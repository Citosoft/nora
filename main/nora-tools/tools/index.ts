import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { registerAppTools } from "./app";
import { registerBotTools, registerBotListTool } from "./bots";
import { registerAskBotTool, registerGroupTools, registerMemoryTools } from "./conversation";
import { registerTaskTools } from "./tasks";
import { registerThreadTools } from "./threads";

/**
 * Registers the tools for the calling thread's audience (see `audience` in the shared catalog). Nora threads manage the app;
 * bot threads talk to other bots and keep their own notes, and read the group chat they answer in.
 */
export function registerNoraTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  registerAskBotTool(server, context, deps);
  registerBotListTool(server, context, deps);
  if (context.audience === "bot") {
    registerMemoryTools(server, context, deps);
    if (context.group) registerGroupTools(server, context, deps);
    return;
  }
  registerBotTools(server, context, deps);
  registerAppTools(server, context, deps);
  registerThreadTools(server, context, deps);
  registerTaskTools(server, context, deps);
}
