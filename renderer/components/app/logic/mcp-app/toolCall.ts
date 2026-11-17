import { z } from "zod";
import type { ToolActivity } from "@shared/types/conversation/contracts.types";
import type { McpAppToolResult } from "@shared/types/conversation/mcpApp.types";
import type { McpAppToolArguments, McpAppToolCall } from "@/components/app/types/mcpApp.types";

const argumentsSchema = z.record(z.string(), z.json());

/** A widget's tool-call arguments, accepted only as a JSON object. */
export function mcpAppToolArguments(value: unknown): McpAppToolArguments | null {
  const parsed = argumentsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : null;
}

/** A tool call shaped for its widget entry, or null when its server declared no widget. */
export function mcpAppToolCall(tool: ToolActivity): McpAppToolCall | null {
  return tool.details?.app ? { tool, app: tool.details.app } : null;
}

/** The result handed to the widget: the raw MCP result when it was kept, otherwise the call's text output. */
export function mcpAppToolResult(call: McpAppToolCall): McpAppToolResult | null {
  if (call.tool.state === "running") return null;
  if (call.app.result) return call.app.result;
  return { content: call.tool.output ? [{ type: "text", text: call.tool.output }] : [], ...(call.tool.state === "failed" ? { isError: true } : {}) };
}

/** Whether the call ended without a result the widget can show. */
export function mcpAppToolCancelled(call: McpAppToolCall): boolean {
  return call.tool.state === "interrupted" || call.tool.state === "declined" || call.tool.state === "unconfirmed";
}

/** The text of a widget's `ui/message`; non-text blocks are left out because the composer only takes text. */
export function mcpAppMessageText(content: readonly unknown[]): string {
  return content.flatMap((block) => block !== null && typeof block === "object" && "type" in block && block.type === "text"
    && "text" in block && typeof block.text === "string" ? [block.text] : []).join("\n\n").trim();
}

/** Links a widget may open: web pages and mail only. */
export function isMcpAppLink(url: string): boolean {
  return URL.canParse(url) && ["https:", "http:", "mailto:"].includes(new URL(url).protocol);
}
