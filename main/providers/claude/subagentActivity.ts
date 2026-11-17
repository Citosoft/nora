import { z } from "zod";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeSubagentFrame } from "@main/types/execution/claude.types";
import type { ToolState } from "@shared/types/conversation/contracts.types";
import { claudeToolCallSchema, claudeToolResultSchema } from "./toolSchemas";
import { formatToolContent } from "../toolPresentation";

/** Claude names its delegation tool `Agent`; older CLIs call it `Task`. */
const agentToolNames = new Set(["Agent", "Task"]);
const agentInputSchema = z.object({ description: z.string().optional(), prompt: z.string().optional(), subagent_type: z.string().optional(),
  model: z.string().optional(), effort: z.string().optional() });

type TaskMessage = Extract<SDKMessage, { type: "system"; subtype: "task_started" | "task_progress" | "task_notification" | "task_updated" }>;

/**
 * Tracks Claude subagents by the id of the tool call that spawned them, which is also the
 * `parent_tool_use_id` of everything the subagent does, so its tools link back to it.
 */
export class ClaudeSubagentActivity {
  private readonly agents = new Map<string, ClaudeSubagentFrame>();
  private readonly taskAgents = new Map<string, string>();
  /** Background agents return a placeholder tool result immediately; their outcome arrives as a task notification. */
  private readonly backgrounded = new Set<string>();

  isAgentCall(name: string): boolean { return agentToolNames.has(name); }
  has(nativeId: string): boolean { return this.agents.has(nativeId); }
  /** Whether a task event reports on a subagent rather than a shell or other background task. */
  ownsTask(message: TaskMessage): boolean { return this.agentIdForTask(message) !== null; }

  accept(message: SDKMessage): ClaudeSubagentFrame[] {
    if (message.type === "system" && (message.subtype === "task_started" || message.subtype === "task_progress"
      || message.subtype === "task_notification" || message.subtype === "task_updated")) return this.acceptTask(message);
    if (message.type === "system" && message.subtype === "permission_denied" && this.agents.has(message.tool_use_id)) {
      return this.put(message.tool_use_id, message.uuid, { state: "declined", result: message.decision_reason ?? "Permission was declined." });
    }
    if (message.type === "assistant" && message.parent_tool_use_id && this.agents.has(message.parent_tool_use_id)) {
      const text = message.message.content.flatMap((block) => block.type === "text" && block.text.trim() ? [block.text.trim()] : []).at(-1);
      // The subagent's own responses name the model that actually ran, replacing any requested alias.
      const model = message.message.model && message.message.model !== this.agents.get(message.parent_tool_use_id)?.model ? message.message.model : undefined;
      if (text || model) return this.put(message.parent_tool_use_id, message.uuid, { ...(text ? { progress: text } : {}), ...(model ? { model } : {}) });
    }
    const blocks = message.type === "assistant" ? message.message.content
      : message.type === "user" && Array.isArray(message.message.content) ? message.message.content : [];
    return blocks.flatMap((block) => {
      const call = claudeToolCallSchema.safeParse(block);
      if (call.success && this.isAgentCall(call.data.name)) {
        const input = agentInputSchema.safeParse(call.data.input);
        const fields = input.success ? input.data : {};
        return this.put(call.data.id, `${message.uuid}:${call.data.id}`, { label: fields.description ?? fields.subagent_type ?? "Agent", state: "running",
          ...(fields.subagent_type ? { agentType: fields.subagent_type } : {}), ...(fields.prompt ? { prompt: fields.prompt } : {}),
          ...(fields.model ? { model: fields.model } : {}), ...(fields.effort ? { effort: fields.effort } : {}) });
      }
      const result = claudeToolResultSchema.safeParse(block);
      if (!result.success || !this.agents.has(result.data.tool_use_id) || this.backgrounded.has(result.data.tool_use_id)) return [];
      return this.put(result.data.tool_use_id, `${message.uuid}:${result.data.tool_use_id}`, { state: result.data.is_error ? "failed" : "completed",
        ...(result.data.content === undefined ? {} : { result: formatToolContent(result.data.content) }) });
    });
  }

  finish(state: ToolState, eventId: string): ClaudeSubagentFrame[] {
    return [...this.agents.values()].filter((agent) => agent.state === "running").flatMap((agent) => this.put(agent.nativeId, `${eventId}:${agent.nativeId}:settled`, {
      state, progress: this.backgrounded.has(agent.nativeId) ? "Still running in the background when the turn ended; later updates were not received."
        : state === "unconfirmed" ? "The task ended without a result from this agent." : "The task stopped before this agent finished." }));
  }

  private acceptTask(message: TaskMessage): ClaudeSubagentFrame[] {
    const nativeId = this.agentIdForTask(message);
    if (!nativeId) return [];
    this.taskAgents.set(message.task_id, nativeId);
    switch (message.subtype) {
      case "task_started":
        if (message.is_backgrounded) this.backgrounded.add(nativeId);
        return this.put(nativeId, message.uuid, { label: this.agents.get(nativeId)?.label ?? message.description, state: "running",
          ...(message.subtype === "task_started" && message.subagent_type ? { agentType: message.subagent_type } : {}) });
      case "task_progress":
        return this.put(nativeId, message.uuid, { progress: message.summary ?? (message.last_tool_name ? `Using ${message.last_tool_name}` : message.description) });
      case "task_notification":
        this.backgrounded.delete(nativeId);
        return this.put(nativeId, message.uuid, { state: message.status === "stopped" ? "interrupted" : message.status, result: message.summary });
      case "task_updated": {
        if (message.patch.is_backgrounded) this.backgrounded.add(nativeId);
        const status = message.patch.status;
        const state: ToolState | undefined = status === "failed" ? "failed" : status === "killed" ? "interrupted" : status === "completed" ? "completed" : undefined;
        return this.put(nativeId, message.uuid, { ...(state ? { state } : {}), ...(message.patch.error ? { result: message.patch.error } : {}),
          ...(status === "paused" ? { progress: "Paused" } : {}) });
      }
    }
  }

  private agentIdForTask(message: TaskMessage): string | null {
    const known = this.taskAgents.get(message.task_id);
    if (known) return known;
    const toolUseId = "tool_use_id" in message ? message.tool_use_id : undefined;
    if (toolUseId && this.agents.has(toolUseId)) return toolUseId;
    // A subagent resumed without its spawning call in this stream still reports itself as a local agent.
    if (message.subtype === "task_started" && (message.task_type === "local_agent" || message.subagent_type)) return toolUseId ?? `task:${message.task_id}`;
    return null;
  }

  private put(nativeId: string, eventId: string, patch: Partial<Omit<ClaudeSubagentFrame, "kind" | "nativeId" | "eventId">>): ClaudeSubagentFrame[] {
    const previous = this.agents.get(nativeId);
    // A late progress event cannot reopen an agent whose outcome is already known.
    if (previous && previous.state !== "running" && patch.state === "running") return [];
    const frame: ClaudeSubagentFrame = { label: "Agent", state: "running", ...previous, ...patch, kind: "subagent", nativeId, eventId };
    this.agents.set(nativeId, frame);
    return [frame];
  }
}
