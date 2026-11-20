import type { ConversationRun } from "@shared/types/conversation/contracts.types";
import type { ActiveWorkCount, ActiveWorkInput, ActiveWorkItem } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

const RUN_LABELS: Record<ConversationRun["state"], string | null> = {
  queued: "Queued", starting: "Starting", running: "Running", "awaiting-approval": "Waiting for approval",
  "awaiting-input": "Waiting for input", stopping: "Stopping", recovering: "Recovering",
  completed: null, failed: null, interrupted: null
};

/** Lists work quitting would interrupt, including queued messages and requests awaiting the user. */
export function countActiveWork({ conversations, agents }: ActiveWorkInput): ActiveWorkCount {
  const items: ActiveWorkItem[] = [];
  for (const summary of conversations) {
    const statuses: string[] = [];
    const runLabel = summary.latestRun ? RUN_LABELS[summary.latestRun.state] : null;
    if (runLabel) statuses.push(runLabel);
    if (summary.pendingRequestCount > 0 && runLabel !== "Waiting for approval" && runLabel !== "Waiting for input") {
      statuses.push("Waiting for approval or input");
    }
    if (summary.queuedCount > 0 && runLabel !== "Queued") statuses.push(`${summary.queuedCount} queued`);
    if (statuses.length === 0) continue;
    items.push({ kind: "thread", title: summary.conversation.title, workspace: summary.conversation.workspace.path,
      status: statuses.join(", ") });
  }
  const activeConversations = items.length;
  for (const agent of agents) {
    if (!agent.isBusy) continue;
    items.push({ kind: "terminal-agent", title: agent.threadTitle?.trim() || agent.name,
      workspace: agent.workspace, status: "Terminal agent running" });
  }
  return { conversations: activeConversations, agents: items.length - activeConversations, total: items.length, items };
}
