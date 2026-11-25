import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { formatTerminalList, formatTerminalOpen, formatTerminalPaste } from "../operations/terminals";
import { runTool } from "./result";

export function registerTerminalTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("list_terminals", { ...NORA_TOOLS.list_terminals, annotations: { readOnlyHint: true, openWorldHint: false } },
    () => runTool(() => formatTerminalList(deps.terminals.list(context))));
  server.registerTool("open_terminal", { ...NORA_TOOLS.open_terminal,
    inputSchema: {
      kind: z.enum(["local", "workspace"]).describe("local for the permanent dock, workspace for a new blank project terminal"),
      name: z.string().trim().min(1).max(120).optional().describe("Optional name for a new workspace terminal")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(async () => formatTerminalOpen(await deps.terminals.open({
    kind: input.kind,
    ...(input.name ? { name: input.name } : {})
  }, context))));
  server.registerTool("paste_terminal", { ...NORA_TOOLS.paste_terminal,
    inputSchema: {
      id: z.string().trim().min(1).max(200).describe("Terminal id from list_terminals or open_terminal"),
      text: z.string().min(1).max(100_000).describe("Text to paste; a trailing newline is stripped so Enter is not pressed")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(async () => {
    const terminal = await deps.terminals.paste(input.id, input.text, context);
    return formatTerminalPaste(terminal, input.text.replace(/(?:\r\n|\n|\r)$/u, ""));
  }));
}
