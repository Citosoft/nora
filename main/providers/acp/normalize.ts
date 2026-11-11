import { z } from "zod";
import type { ContentBlock, PermissionOption, PlanEntry, StopReason, ToolCall, ToolCallContent, ToolCallUpdate } from "@agentclientprotocol/sdk";
import type { ApprovalDetails, ApprovalRequest, ExecutionFailure, ToolActivity, ToolDetails, ToolState, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { JsonValue } from "@main/types/execution/json.types";
import { formatToolContent, formatToolInput } from "@main/providers/toolPresentation";

const jsonValueSchema = z.json();

/** ACP payload fields are untyped JSON; validate before formatting so nothing non-JSON reaches the timeline. */
function asJson(value: unknown): JsonValue | null {
  const parsed = jsonValueSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function acpToolCategory(kind: ToolCall["kind"]): NonNullable<ToolDetails["category"]> {
  switch (kind) {
    case "execute": return "command";
    case "read":
    case "edit":
    case "delete":
    case "move": return "file";
    case "search": return "search";
    case "fetch": return "integration";
    default: return "other";
  }
}

export function acpToolState(status: ToolCall["status"]): ToolState {
  switch (status) {
    case "completed": return "completed";
    case "failed": return "failed";
    default: return "running";
  }
}

/** ACP diffs carry whole old/new text; a single replacing hunk keeps them renderable as a unified patch. */
export function acpDiffPatch(path: string, oldText: string | null | undefined, newText: string): string {
  const before = oldText ? oldText.split("\n") : [];
  const after = newText.split("\n");
  return [`--- ${oldText == null ? "/dev/null" : `a/${path}`}`, `+++ b/${path}`, `@@ -${before.length ? 1 : 0},${before.length} +1,${after.length} @@`,
    ...before.map((line) => `-${line}`), ...after.map((line) => `+${line}`)].join("\n");
}

function contentText(block: ContentBlock): string {
  switch (block.type) {
    case "text": return block.text;
    case "resource_link": return `[${block.title ?? block.name}]`;
    case "resource": return "text" in block.resource ? block.resource.text : `[${block.resource.uri}]`;
    default: return `[${block.type} content]`;
  }
}

function toolOutput(content: readonly ToolCallContent[]): { output: string; patch: string | null } {
  const outputs: string[] = [];
  const patches: string[] = [];
  for (const entry of content) {
    if (entry.type === "content") outputs.push(contentText(entry.content));
    else if (entry.type === "diff") patches.push(acpDiffPatch(entry.path, entry.oldText, entry.newText));
    else outputs.push("[Terminal output]");
  }
  return { output: outputs.join("\n"), patch: patches.length ? patches.join("\n") : null };
}

/** Merges a tool call or partial update into the previous activity; a settled tool never returns to running. */
export function applyAcpToolUpdate(previous: ToolActivity | undefined, update: ToolCall | ToolCallUpdate,
  identity: Pick<ToolActivity, "id" | "runId" | "createdAt">): ToolActivity | null {
  const nextState = update.status ? acpToolState(update.status) : previous?.state ?? "running";
  if (previous && previous.state !== "running" && nextState === "running") return null;
  const rendered = update.content ? toolOutput(update.content) : null;
  const rawOutput = update.rawOutput === undefined || update.rawOutput === null ? null : asJson(update.rawOutput);
  const rawInput = update.rawInput === undefined || update.rawInput === null ? null : asJson(update.rawInput);
  const paths = update.locations?.map((location) => location.path) ?? [];
  const output = rendered?.output || (rawOutput === null ? previous?.output ?? "" : formatToolContent(rawOutput));
  const details: ToolDetails = {
    ...previous?.details,
    category: update.kind ? acpToolCategory(update.kind) : previous?.details?.category ?? "other",
    ...(rawInput !== null ? { input: formatToolInput(rawInput) } : !previous?.details?.input && paths.length ? { input: paths.join("\n") } : {}),
    ...(rendered?.patch ? { patch: rendered.patch } : {})
  };
  return { ...identity, kind: "tool", label: update.title || previous?.label || "Tool", output, state: nextState, details };
}

export function acpApprovalDetails(toolCall: ToolCallUpdate): ApprovalDetails | undefined {
  const input = toolCall.rawInput === undefined || toolCall.rawInput === null ? null : asJson(toolCall.rawInput);
  const paths = toolCall.locations?.map((location) => location.path) ?? [];
  switch (toolCall.kind) {
    case "execute": return input !== null ? { kind: "command", command: formatToolInput(input) } : undefined;
    case "edit":
    case "delete":
    case "move": return paths.length ? { kind: "files", paths } : input !== null ? { kind: "tool", input: formatToolInput(input) } : undefined;
    case "fetch": return { kind: "network", ...(input !== null ? { target: formatToolInput(input) } : {}) };
    default: return input !== null ? { kind: "tool", input: formatToolInput(input) } : undefined;
  }
}

/** ACP option ids are used directly as Nora option ids so a response maps back without a lookup table. */
export function acpApprovalOptions(options: readonly PermissionOption[]): ApprovalRequest["options"] {
  return options.map((option) => {
    switch (option.kind) {
      case "allow_once": return { id: option.optionId, label: option.name, intent: "allow", scope: "once" };
      case "allow_always": return { id: option.optionId, label: option.name, intent: "allow", scope: "persistent" };
      case "reject_once": return { id: option.optionId, label: option.name, intent: "deny", scope: "once" };
      case "reject_always": return { id: option.optionId, label: option.name, intent: "deny", scope: "persistent" };
      default: return { id: option.optionId, label: option.name };
    }
  });
}

export function acpPlanSteps(entries: readonly PlanEntry[]): Extract<TimelineItem, { kind: "plan" }>["steps"] {
  return entries.map((entry) => ({ text: entry.content,
    state: entry.status === "completed" ? "completed" : entry.status === "in_progress" ? "running" : "pending" }));
}

export function acpStreamText(content: ContentBlock): string {
  return content.type === "text" ? content.text : "";
}

export function acpTurnOutcome(stopReason: StopReason, label: string): { status: "completed" | "failed" | "interrupted"; failure: ExecutionFailure | null } {
  switch (stopReason) {
    case "end_turn": return { status: "completed", failure: null };
    case "cancelled": return { status: "interrupted", failure: null };
    case "refusal": return { status: "failed", failure: { code: "provider", message: `${label} declined to continue this request`, retryable: false } };
    case "max_tokens": return { status: "failed", failure: { code: "provider", message: `${label} reached its output limit before finishing`, retryable: true } };
    case "max_turn_requests": return { status: "failed", failure: { code: "provider", message: `${label} reached its step limit before finishing`, retryable: true } };
  }
}
