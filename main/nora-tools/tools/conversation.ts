import { formatAskBotReply } from "@shared/nora-tools/askBot";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import { BOT_MEMORY_TEXT_MAX } from "@shared/bots/contracts";
import type { BotMemoryEntry } from "@shared/types/bots/bots.types";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { runTool } from "./result";
import { noteLine } from "@main/bots/memory/format";

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
  const recallLine = (note: BotMemoryEntry): string => `${noteLine(note)}${note.workspaceId ? " (this workspace)" : ""}`;
  server.registerTool("remember", { ...NORA_TOOLS.remember,
    inputSchema: {
      text: z.string().trim().min(1).max(BOT_MEMORY_TEXT_MAX).describe("One self-contained note"),
      scope: z.enum(["bot", "workspace"]).optional().describe("bot (default) applies in every workspace; workspace only in this one. Ignored with memory_id"),
      memory_id: z.string().trim().min(1).max(512).optional().describe("The id of a note you saved, to replace its text")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(() => {
    const { note, updated } = deps.memory.remember(input.memory_id ? { kind: "update", memoryId: input.memory_id, text: input.text }
      : { kind: "add", text: input.text, scope: input.scope ?? "bot" }, context);
    return `${updated ? "Updated" : "Saved"} note ${note.id}${note.workspaceId ? " for this workspace" : ""}. The user can see and edit your notes in your info panel in Bots.`;
  }));
  server.registerTool("recall", { ...NORA_TOOLS.recall,
    inputSchema: { query: z.string().trim().max(200).describe("Words to look for; empty lists your newest notes") },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input) => runTool(() => {
    const notes = deps.memory.recall(input.query, context);
    return notes.length ? notes.map(recallLine).join("\n") : "No matching notes.";
  }));
  server.registerTool("forget", { ...NORA_TOOLS.forget,
    inputSchema: { memory_id: z.string().trim().min(1).max(512).describe("The id of the note, from recall or your saved notes") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(() => `Forgot: ${deps.memory.forget(input.memory_id, context).text}`));
}

export function registerChatTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("chat_history", { ...NORA_TOOLS.chat_history,
    inputSchema: {
      skip: z.number().int().min(0).max(2000).optional().describe("How many of the newest messages to skip, to page further back (default 0)"),
      limit: z.number().int().min(1).max(50).optional().describe("Most messages to return (default 20)")
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input) => runTool(() => {
    const history = deps.chats.history(input.skip ?? 0, input.limit ?? 20, context);
    if (!history.messages.length) return `${history.title} has no earlier messages.`;
    return [`Chat: ${history.title}${history.more ? " (older messages exist; raise skip to read them)" : ""}`,
      ...history.messages.map((message) => `\n[${message.author} · ${message.createdAt}]\n${message.text}`)].join("\n");
  }));
}
