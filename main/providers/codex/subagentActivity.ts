import type { JsonValue } from "@main/types/execution/rpc.types";
import type { CodexSubagentContext, CodexSubagentUpdate } from "@main/types/execution/codex.types";
import type { SubagentActivity, ToolState } from "@shared/types/conversation/contracts.types";
import { codexToolState } from "./toolActivity";
import { collabAgentToolCallSchema, subAgentActivitySchema } from "./toolSchemas";

/** Maps Codex's per-agent status (CollabAgentStatus) onto timeline states. */
function agentState(status: string): ToolState {
  switch (status) {
    case "completed": case "shutdown": return "completed";
    case "errored": return "failed";
    case "interrupted": return "interrupted";
    case "notFound": return "unconfirmed";
    default: return "running";
  }
}

function activityState(kind: string): ToolState {
  return kind === "completed" ? "completed" : kind === "interrupted" ? "interrupted" : "running";
}

/** A short title from the delegated prompt, for agents Codex has not yet named. */
function promptTitle(prompt: string | null | undefined): string | undefined {
  const line = prompt?.split("\n").find((entry) => entry.trim())?.trim();
  return line && line.length > 80 ? `${line.slice(0, 79)}…` : line;
}

/**
 * Codex identifies a spawned agent by its own thread id. Agents can be reported again in later turns
 * (for example by `wait`), so each report becomes an item in the current turn merged with the agent's latest known state.
 */
export function normalizeCodexSubagents(value: JsonValue, context: CodexSubagentContext): CodexSubagentUpdate | null {
  const activity = subAgentActivitySchema.safeParse(value);
  if (activity.success) {
    const { agentThreadId, agentPath, kind, model, reasoningEffort } = activity.data;
    const name = agentPath.replace(/^\/+/, "") || agentPath;
    return { replacesTool: true, items: [merge(agentThreadId, context, { label: name, agentType: name, state: activityState(kind),
      ...modelFields(model, reasoningEffort), ...(kind === "interacted" ? { progress: "Received new instructions" } : {}) })] };
  }
  const call = collabAgentToolCallSchema.safeParse(value);
  if (!call.success) return null;
  const native = call.data;
  const spawn = native.tool === "spawnAgent" || native.tool === "spawn_agent";
  const receivers = spawn ? native.receiverThreadIds ?? [] : Object.keys(native.agentsStates ?? {}).filter((id) => context.find(id));
  const callState = codexToolState(native.status, context.complete);
  const items = receivers.map((threadId) => {
    const reported = native.agentsStates?.[threadId];
    const state = reported ? agentState(reported.status) : spawn && callState === "failed" ? "failed" : undefined;
    return merge(threadId, context, { ...(spawn ? { label: promptTitle(native.prompt) ?? "Agent", ...(native.prompt ? { prompt: native.prompt } : {}),
      ...modelFields(native.model, native.reasoningEffort) } : {}),
      ...(state ? { state } : {}), ...(reported?.message ? { [state === "running" ? "progress" : "result"]: reported.message } : {}) });
  });
  return { replacesTool: spawn, items };
}

function modelFields(model: string | null | undefined, effort: string | null | undefined): Pick<SubagentActivity, "model" | "effort"> {
  return { ...(model ? { model } : {}), ...(effort ? { effort } : {}) };
}

function merge(nativeId: string, context: CodexSubagentContext, patch: Partial<Pick<SubagentActivity, "label" | "state" | "agentType" | "prompt" | "progress" | "result" | "model" | "effort">>): SubagentActivity {
  const previous = context.find(nativeId);
  const sameTurn = previous?.runId === context.runId;
  // Names from activity records are authoritative; a spawn prompt title only fills a missing name.
  const label = patch.agentType ? patch.label : previous?.label ?? patch.label;
  return { ...previous, ...patch, label: label ?? "Agent", state: patch.state ?? previous?.state ?? "running", kind: "subagent", nativeId,
    id: sameTurn && previous ? previous.id : JSON.stringify([context.runId, nativeId, "subagent"]), runId: context.runId,
    createdAt: sameTurn && previous ? previous.createdAt : context.now };
}
