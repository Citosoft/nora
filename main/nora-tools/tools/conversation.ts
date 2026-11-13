import { formatAskBotReply } from "@shared/nora-tools/askBot";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import { BOT_MEMORY_TEXT_MAX } from "@shared/bots/contracts";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { runTool } from "./result";

export function registerAskBotTool(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("ask_bot", { ...NORA_TOOLS.ask_bot,
    inputSchema: {
      bot: z.string().trim().min(1).max(100).describe("The bot's id or name from list_bots"),
      message: z.string().trim().min(1).max(20_000).describe("What you want from the bot, with any context it needs; it cannot see this thread")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input, extra) => runTool(async () => {
    const result = await deps.asks.ask(input.bot, input.message, context, extra.signal);
    return formatAskBotReply(result.botName, result.conversationId, result.reply);
  }));
}

export function registerMemoryTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("remember", { ...NORA_TOOLS.remember,
    inputSchema: {
      text: z.string().trim().min(1).max(BOT_MEMORY_TEXT_MAX).describe("One self-contained note"),
      scope: z.enum(["bot", "workspace"]).optional().describe("bot (default) applies everywhere you run; workspace only in this workspace")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(() => {
    const note = deps.memory.remember(input.text, input.scope ?? "bot", context);
    return `Saved${note.workspaceId ? " for this workspace" : ""}. The user can see and edit your notes in Settings → Bots.`;
  }));
  server.registerTool("recall", { ...NORA_TOOLS.recall,
    inputSchema: { query: z.string().trim().max(200).describe("Words to look for; empty lists your newest notes") },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input) => runTool(() => {
    const notes = deps.memory.recall(input.query, context);
    return notes.length ? notes.map((note) => `- ${note.text}${note.workspaceId ? " (this workspace)" : ""}`).join("\n") : "No matching notes.";
  }));
}

export function registerGroupTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("group_history", { ...NORA_TOOLS.group_history,
    inputSchema: {
      skip: z.number().int().min(0).max(2000).optional().describe("How many of the newest messages to skip, to page further back (default 0)"),
      limit: z.number().int().min(1).max(50).optional().describe("Most messages to return (default 20)")
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input) => runTool(() => {
    const history = deps.groups.history(input.skip ?? 0, input.limit ?? 20, context);
    if (!history.messages.length) return `${history.title} has no earlier messages.`;
    return [`Group chat: ${history.title}${history.more ? " (older messages exist; raise skip to read them)" : ""}`,
      ...history.messages.map((message) => `\n[${message.author} · ${message.createdAt}]\n${message.text}`)].join("\n");
  }));
}
