import type { ConversationRun } from "@shared/types/conversation/contracts.types";
import type { ActiveWorkCount, ActiveWorkInput } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

const SETTLED_RUN_STATES: ReadonlySet<ConversationRun["state"]> = new Set(["completed", "failed", "interrupted"]);

/** Counts work that quitting would interrupt: native threads still running, queued or waiting, and busy terminal agents. */
export function countActiveWork({ conversations, agents }: ActiveWorkInput): ActiveWorkCount {
  const activeConversations = conversations.filter((summary) =>
    (summary.latestRun !== null && !SETTLED_RUN_STATES.has(summary.latestRun.state))
    || summary.queuedCount > 0
    || summary.pendingRequestCount > 0).length;
  const busyAgents = agents.filter((agent) => agent.isBusy).length;
  return { conversations: activeConversations, agents: busyAgents, total: activeConversations + busyAgents };
}
