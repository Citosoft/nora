import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { runTool } from "./result";

export function registerThreadTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("list_threads", { ...NORA_TOOLS.list_threads,
    inputSchema: {
      all_workspaces: z.boolean().optional().describe("Include threads from every workspace, not just this one"),
      include_settled: z.boolean().optional().describe("Include settled (archived) threads"),
      limit: z.number().int().min(1).max(100).optional().describe("Most threads to return (default 30)")
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input) => runTool(() => {
    const threads = deps.threads.list({ allWorkspaces: input.all_workspaces ?? false, includeSettled: input.include_settled ?? false, limit: input.limit ?? 30 }, context);
    if (!threads.length) return context.audience === "bot" ? "You have no other threads here." : "There are no threads here.";
    return threads.map((thread) => `- ${thread.title} (id ${thread.id})${thread.current ? " — this thread" : ""}; ${thread.bot ? `bot ${thread.bot}` : "Nora"}; `
      + `${thread.status}; ${thread.workspace}; last activity ${thread.updatedAt}`).join("\n");
  }));
  server.registerTool("read_thread", { ...NORA_TOOLS.read_thread,
    inputSchema: {
      id: z.string().min(1).max(512).describe("Thread id from list_threads"),
      limit: z.number().int().min(1).max(50).optional().describe("Most recent messages to return (default 20)")
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input) => runTool(() => {
    const transcript = deps.threads.read(input.id, input.limit ?? 20, context);
    if (!transcript.messages.length) return `${transcript.title} has no messages yet.`;
    return [`Thread: ${transcript.title}${transcript.truncated ? " (earlier messages omitted)" : ""}`,
      ...transcript.messages.map((message) => `\n[${message.role === "user" ? "User" : "Assistant"} · ${message.createdAt}]\n${message.text}`)].join("\n");
  }));
}
