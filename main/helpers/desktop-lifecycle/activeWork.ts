import { agentToolLabel } from "@main/agentCatalog";
import type { ConversationRun } from "@shared/types/conversation/contracts.types";
import type { IslandIdentity, IslandPhase } from "@shared/types/island/island.types";
import type { ActiveWorkCount, ActiveWorkInput, ActiveWorkItem } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

const RUN_ACTIVITY: Record<ConversationRun["state"], { label: string; phase: IslandPhase } | null> = {
  queued: { label: "Queued", phase: "queued" }, starting: { label: "Starting", phase: "running" },
  running: { label: "Running", phase: "running" }, "awaiting-approval": { label: "Waiting for approval", phase: "waiting" },
  "awaiting-input": { label: "Waiting for input", phase: "waiting" }, stopping: { label: "Stopping", phase: "running" },
  recovering: { label: "Recovering", phase: "running" }, completed: null, failed: null, interrupted: null
};

type ConversationActivityInput = ActiveWorkInput["conversations"][number];

/** How one thread stands, or null when nothing in it is in progress, queued or waiting on the user. */
function conversationActivity(summary: ConversationActivityInput): { status: string; phase: IslandPhase } | null {
  const statuses: string[] = [];
  const run = summary.latestRun ? RUN_ACTIVITY[summary.latestRun.state] : null;
  let phase: IslandPhase | null = run?.phase ?? null;
  if (run) statuses.push(run.label);
  if (summary.pendingRequestCount > 0 && run?.phase !== "waiting") {
    statuses.push("Waiting for approval or input");
    phase = "waiting";
  }
  if (summary.queuedCount > 0 && run?.phase !== "queued") {
    statuses.push(`${summary.queuedCount} queued`);
    phase ??= "queued";
  }
  return phase ? { status: statuses.join(", "), phase } : null;
}

function conversationIdentity({ bot, provider }: ConversationActivityInput["conversation"]): IslandIdentity {
  if (bot) return { kind: "bot", name: bot.name, avatar: bot.avatar };
  return { kind: "provider", toolId: provider.kind, label: agentToolLabel(provider.kind), connection: provider.connection ?? "unknown" };
}

/** Lists work quitting would interrupt, including queued messages and requests awaiting the user. */
export function countActiveWork({ conversations, agents }: ActiveWorkInput): ActiveWorkCount {
  const items: ActiveWorkItem[] = [];
  for (const summary of conversations) {
    const activity = conversationActivity(summary);
    if (!activity) continue;
    const { conversation } = summary;
    items.push({ kind: "thread", title: conversation.title, workspace: conversation.workspace.path, ...activity,
      identity: conversationIdentity(conversation), activeAt: summary.latestRun?.updatedAt ?? conversation.updatedAt,
      target: { kind: "thread", conversationId: conversation.id } });
  }
  const activeConversations = items.length;
  for (const agent of agents) {
    if (!agent.isBusy) continue;
    items.push({ kind: "terminal-agent", title: agent.threadTitle?.trim() || agent.name, workspace: agent.workspace,
      status: "Terminal agent running", phase: "running", activeAt: agent.lastEventAt,
      identity: { kind: "provider", toolId: agent.toolId, label: agent.toolLabel, connection: "unknown" },
      target: { kind: "terminal-agent", agentId: agent.id } });
  }
  return { conversations: activeConversations, agents: items.length - activeConversations, total: items.length, items };
}
