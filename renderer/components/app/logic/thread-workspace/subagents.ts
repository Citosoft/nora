import type { TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";
import type { ThreadSubagent, ThreadSubagentSummary } from "@/components/app/types/threadSubagents.types";

/**
 * Providers may report the same agent several times (later turns, recovered history), so agents are keyed by
 * their native id and later reports override earlier ones. Tools whose parent is that id are the agent's own activity.
 */
export function summarizeThreadSubagents(items: readonly TimelineItem[]): ThreadSubagentSummary {
  const agents = new Map<string, ThreadSubagent>();
  const activity = new Map<string, ToolActivity[]>();
  for (const item of items) {
    if (item.kind === "subagent") {
      const previous = agents.get(item.nativeId);
      const { nativeId, label, state, agentType, prompt, progress, result, model, effort } = item;
      agents.set(nativeId, { ...previous, nativeId, label, state, startedAt: previous?.startedAt ?? item.createdAt, activity: [],
        ...(agentType ? { agentType } : {}), ...(prompt ? { prompt } : {}), ...(progress ? { progress } : {}), ...(result ? { result } : {}),
        ...(model ? { model } : {}), ...(effort ? { effort } : {}) });
    } else if (item.kind === "tool" && item.details?.parentId) {
      const tools = activity.get(item.details.parentId) ?? [];
      tools.push(item);
      activity.set(item.details.parentId, tools);
    }
  }
  const list = [...agents.values()].map((agent) => ({ ...agent, activity: activity.get(agent.nativeId) ?? [] }))
    // Running agents first, then the most recently started.
    .sort((a, b) => Number(b.state === "running") - Number(a.state === "running") || b.startedAt.localeCompare(a.startedAt));
  return { agents: list, running: list.filter((agent) => agent.state === "running").length };
}
