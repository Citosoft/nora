import type { JsonValue } from "@main/types/execution/rpc.types";
import type { TimelineIdentity } from "@main/types/execution/toolActivity.types";
import type { ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";
import { formatToolContent, formatToolInput } from "../toolPresentation";
import { codexToolSchema, nativeItemIdentitySchema } from "./toolSchemas";

export function codexToolState(status: string | undefined, complete: boolean): ToolState {
  if (status === "failed" || status === "errored") return "failed";
  if (status === "declined") return "declined";
  if (status === "interrupted" || status === "cancelled") return "interrupted";
  return complete || status === "completed" ? "completed" : "running";
}

export function normalizeCodexTool(value: JsonValue, identity: TimelineIdentity, complete: boolean, previous?: ToolActivity): ToolActivity | null {
  const item = readCodexTool(value, identity, complete, previous);
  return item ? { ...item, details: { ...previous?.details, ...item.details, category: item.details?.category ?? previous?.details?.category ?? "other" } } : null;
}

function readCodexTool(value: JsonValue, identity: TimelineIdentity, complete: boolean, previous?: ToolActivity): ToolActivity | null {
  const parsed = codexToolSchema.safeParse(value);
  if (!parsed.success) {
    const envelope = nativeItemIdentitySchema.safeParse(value);
    if (!envelope.success || ["agentMessage", "reasoning", "fileChange", "userMessage", "hookPrompt", "plan", "enteredReviewMode", "exitedReviewMode", "contextCompaction"].includes(envelope.data.type)) return null;
    return { ...identity, kind: "tool", label: envelope.data.type, state: codexToolState(envelope.data.status, complete), output: previous?.output ?? "",
      details: { category: "other", detail: "Activity details are unavailable for this tool." } };
  }
  const native = parsed.data;
  const tool: ToolActivity = { ...identity, kind: "tool", label: "Tool", output: previous?.output ?? "", state: codexToolState(native.status, complete) };
  switch (native.type) {
    case "commandExecution":
      return { ...tool, label: "Run command", output: native.aggregatedOutput ?? tool.output,
        state: native.exitCode != null && native.exitCode !== 0 ? "failed" : tool.state,
        details: { category: "command", input: native.command, ...(native.cwd ? { detail: native.cwd } : {}),
          ...(native.durationMs != null ? { durationMs: native.durationMs } : {}), ...(native.exitCode != null ? { exitCode: native.exitCode } : {}) } };
    case "mcpToolCall": {
      const output = native.result ? [formatToolContent(native.result.content),
        native.result.structuredContent == null ? "" : formatToolInput(native.result.structuredContent)].filter(Boolean).join("\n") : tool.output;
      return { ...tool, label: native.tool, output: native.error?.message ?? output,
        state: native.error || native.result?.isError ? "failed" : tool.state,
        details: { category: "integration", detail: native.server, ...(native.arguments !== undefined ? { input: formatToolInput(native.arguments) } : {}),
          ...(native.durationMs != null ? { durationMs: native.durationMs } : {}) } };
    }
    case "dynamicToolCall":
      return { ...tool, label: native.tool, output: native.contentItems ? formatToolContent(native.contentItems) : tool.output,
        state: native.success === false ? "failed" : tool.state,
        details: { category: "integration", ...(native.namespace ? { detail: native.namespace } : {}),
          ...(native.arguments !== undefined ? { input: formatToolInput(native.arguments) } : {}), ...(native.durationMs != null ? { durationMs: native.durationMs } : {}) } };
    case "functionCallOutput": return { ...tool, label: native.name, output: formatToolContent(native.output), details: { category: "integration", ...(native.namespace ? { detail: native.namespace } : {}) } };
    case "webSearch": return { ...tool, label: native.action?.type === "openPage" ? "Open page" : native.action?.type === "findInPage" ? "Find on page" : "Search the web",
      details: { category: "search", input: [native.action?.url, native.action?.pattern, ...(native.action?.queries ?? []), native.action?.query ?? native.query].filter(Boolean).join("\n") } };
    case "imageView": return { ...tool, label: "View image", details: { category: "image", input: native.path } };
    case "imageGeneration": return { ...tool, label: "Generate image", state: native.failure ? "failed" : tool.state,
      output: native.failure?.message ?? native.savedPath ?? tool.output, details: { category: "image", ...(native.revisedPrompt ? { input: native.revisedPrompt } : {}) } };
    case "sleep": return { ...tool, label: "Wait", details: { category: "wait", input: `${native.durationMs / 1000} seconds` } };
    case "collabAgentToolCall":
    case "collabToolCall": return { ...tool, label: native.tool, details: { category: "agent", ...(native.prompt ? { input: native.prompt } : {}) } };
    case "subAgentActivity": return { ...tool, label: "Agent activity", details: { category: "agent", detail: native.agentPath, input: formatToolInput(native.kind) } };
  }
}
