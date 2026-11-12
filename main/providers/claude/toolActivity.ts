import { claudeToolCallSchema, claudeToolResultSchema } from "./toolSchemas";
import { z } from "zod";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeToolFrame } from "@main/types/execution/claude.types";
import type { ToolDetails, ToolState } from "@shared/types/conversation/contracts.types";
import type { JsonValue } from "@main/types/execution/rpc.types";
import { skillReadEvidence } from "../skillEvidence";
import { formatToolContent, formatToolInput } from "../toolPresentation";
import { ClaudeSubagentActivity } from "./subagentActivity";

const skillInputSchema = z.object({ skill: z.string().min(1) });
const pathInputSchema = z.object({ file_path: z.string().optional(), command: z.string().optional() });

/** The Skill tool loads a skill by name; a Read or Bash call on a SKILL.md reads one directly. */
function claudeSkillEvidence(name: string, input: JsonValue): Pick<ToolDetails, "skill"> {
  if (name === "Skill") {
    const skill = skillInputSchema.safeParse(input);
    return skill.success ? { skill: { name: skill.data.skill, evidence: "loaded" } } : {};
  }
  const target = pathInputSchema.safeParse(input);
  return target.success && (name === "Read" || name === "Bash") ? skillReadEvidence(target.data.file_path ?? target.data.command) : {};
}

const errorContentSchema = z.object({ type: z.string().refine((type) => type.endsWith("_error")) });
const detachedResultSchema = z.object({ detachedToolCall: z.literal(true) });

/** Tool identities are independent of assistant messages, including nested agent messages. */
export class ClaudeToolActivity {
  private readonly tools = new Map<string, ClaudeToolFrame>();
  private readonly hiddenTasks = new Set<string>();
  /** Subagent calls, results and task events are reported by the subagent tracker instead of as tools. */
  constructor(private readonly agents = new ClaudeSubagentActivity()) {}

  private put(frame: ClaudeToolFrame): ClaudeToolFrame[] {
    const previous = this.tools.get(frame.nativeId);
    if (previous && previous.state !== "running" && frame.state === "running") return [];
    const merged = { ...frame, details: { ...previous?.details, ...frame.details, category: frame.details?.category ?? previous?.details?.category ?? "other" } };
    this.tools.set(frame.nativeId, merged);
    return [merged];
  }

  finish(state: ToolState, eventId: string): ClaudeToolFrame[] {
    return [...this.tools.values()].filter((tool) => tool.state === "running").flatMap((tool) => this.put({ ...tool, state,
      eventId: `${eventId}:${tool.nativeId}:settled`, details: { ...tool.details, category: tool.details?.category ?? "other",
        detail: state === "unconfirmed" ? "The task ended without a tool result." : "The task stopped before this tool finished." } }));
  }

  accept(message: SDKMessage): ClaudeToolFrame[] {
    if (message.type === "tool_progress") {
      const previous = this.tools.get(message.tool_use_id);
      return this.put({ kind: "tool", nativeId: message.tool_use_id, eventId: message.uuid, label: message.tool_name,
        output: previous?.output ?? "", state: "running", details: { category: previous?.details?.category ?? "other",
          durationMs: message.elapsed_time_seconds * 1000, detail: "Tool is running",
          ...(message.parent_tool_use_id ? { parentId: message.parent_tool_use_id } : {}) } });
    }
    if (message.type === "tool_use_summary") {
      return message.preceding_tool_use_ids.flatMap((id) => {
        const previous = this.tools.get(id);
        return previous ? this.put({ ...previous, eventId: `${message.uuid}:${id}`, details: {
          ...previous.details, category: previous.details?.category ?? "other", detail: message.summary } }) : [];
      });
    }
    if (message.type === "system" && message.subtype === "permission_denied") {
      if (this.agents.has(message.tool_use_id)) return [];
      const previous = this.tools.get(message.tool_use_id);
      return this.put({ ...previous, kind: "tool", nativeId: message.tool_use_id, eventId: message.uuid,
        label: message.tool_name, output: message.decision_reason ?? "Permission was declined.", state: "declined" });
    }
    if (message.type === "system" && (message.subtype === "task_started" || message.subtype === "task_progress" || message.subtype === "task_notification")) {
      if (("ambient" in message && message.ambient) || ("skip_transcript" in message && message.skip_transcript)) this.hiddenTasks.add(message.task_id);
      if (this.hiddenTasks.has(message.task_id) || this.agents.ownsTask(message)) return [];
      const nativeId = `task:${message.run_id ?? message.task_id}`;
      const previous = this.tools.get(nativeId);
      const finished = message.subtype === "task_notification";
      return this.put({ kind: "tool", nativeId, eventId: message.uuid,
        label: message.subtype === "task_started" ? message.description : previous?.label ?? "Background task",
        output: finished ? message.summary : previous?.output ?? "", state: finished
          ? message.status === "stopped" ? "interrupted" : message.status : "running",
        details: { category: "agent", ...(message.tool_use_id ? { parentId: message.tool_use_id } : {}),
          ...(message.subtype === "task_progress" && message.summary ? { detail: message.summary } : {}) } });
    }
    if (message.type === "system" && message.subtype === "task_updated") {
      if (this.hiddenTasks.has(message.task_id) || this.agents.ownsTask(message)) return [];
      const nativeId = `task:${message.run_id ?? message.task_id}`;
      const previous = this.tools.get(nativeId);
      return this.put({ kind: "tool", nativeId, eventId: message.uuid, label: message.patch.description ?? previous?.label ?? "Background task",
        output: message.patch.error ?? previous?.output ?? "", state: message.patch.status === "failed" ? "failed" : message.patch.status === "killed" ? "interrupted"
          : message.patch.status === "completed" ? "completed" : previous?.state ?? "running",
        details: { ...previous?.details, category: "agent", ...(message.patch.status === "paused" ? { detail: "Task paused" } : {}) } });
    }
    const blocks = message.type === "assistant" ? message.message.content
      : message.type === "user" && Array.isArray(message.message.content) ? message.message.content
      : message.type === "stream_event" && message.event.type === "content_block_start" ? [message.event.content_block] : [];
    return blocks.flatMap((block) => {
      const call = claudeToolCallSchema.safeParse(block);
      if (call.success) {
        const native = call.data;
        if (this.agents.isAgentCall(native.name)) return [];
        const category = native.name === "Bash" ? "command" : /^(Read|Write|Edit|Glob|Grep|MultiEdit)$/.test(native.name) ? "file"
          : /^(WebSearch|WebFetch)$/.test(native.name) ? "search" : native.name.startsWith("mcp__") ? "integration" : "other";
        return this.put({ kind: "tool", nativeId: native.id, eventId: `${message.uuid}:${native.id}`, label: native.name, output: "", state: "running",
          details: { category, input: formatToolInput(native.input), ...claudeSkillEvidence(native.name, native.input),
            ...("parent_tool_use_id" in message && message.parent_tool_use_id ? { parentId: message.parent_tool_use_id } : {}) } });
      }
      const result = claudeToolResultSchema.safeParse(block);
      if (!result.success || this.agents.has(result.data.tool_use_id)) return [];
      if (message.type === "user" && detachedResultSchema.safeParse(message.tool_use_result).success) return [];
      const native = result.data;
      const previous = this.tools.get(native.tool_use_id);
      const failed = native.is_error || errorContentSchema.safeParse(native.content).success;
      return this.put({ ...previous, kind: "tool", nativeId: native.tool_use_id, eventId: `${message.uuid}:${native.tool_use_id}`,
        label: previous?.label ?? "Tool result", output: native.content === undefined ? "" : formatToolContent(native.content), state: failed ? "failed" : "completed" });
    });
  }
}
