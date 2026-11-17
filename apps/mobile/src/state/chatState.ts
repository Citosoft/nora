import type { ConversationView } from "@shared/types/conversation/conversationView.types";
import type { ConversationRun } from "@shared/types/conversation/contracts.types";
import type { ExecutionState } from "@/types/conversationState.types";
import type { PendingCommand, PendingSendMessage } from "@/types/pendingCommand.types";
import { deriveExecutionState } from "./executionState";

/** Unconfirmed sends for one conversation, oldest first. */
export function pendingSendsFor(pending: readonly PendingCommand[], conversationId: string): PendingSendMessage[] {
  return pending.filter((command): command is PendingSendMessage => command.kind === "send-message" && command.conversationId === conversationId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

/** A send whose run already appears in the conversation reached the computer even if its reply was lost. */
export function deliveredSends(view: ConversationView, sends: readonly PendingSendMessage[]): PendingSendMessage[] {
  const runIds = new Set([...view.runHistory.runs, ...view.header.activeRuns, ...view.header.queuedRuns].map((run) => run.id));
  for (const item of view.items) runIds.add(item.runId);
  return sends.filter((send) => runIds.has(send.runId));
}

/** The run the Stop button cancels: the newest active one. */
export function stoppableRun(view: ConversationView): ConversationRun | null {
  return view.header.activeRuns.at(-1) ?? null;
}

/** The most recent failed run, if it is the latest run, so its failure is explained once. */
export function latestFailure(view: ConversationView): ConversationRun | null {
  const latest = view.runHistory.runs.at(-1);
  return latest?.state === "failed" && latest.failure ? latest : null;
}

const workingLabels: Partial<Record<ConversationRun["state"], string>> = {
  starting: "Starting…", running: "Working…", stopping: "Stopping…", recovering: "Reconnecting to the agent…",
  "awaiting-approval": "Waiting for your approval", "awaiting-input": "Waiting for your answer"
};

export function workingLabel(view: ConversationView): string | null {
  const run = stoppableRun(view);
  if (run) return workingLabels[run.state] ?? null;
  return view.header.queuedRuns.length ? `${view.header.queuedRuns.length} queued` : null;
}

/** The conversation's state for its header, derived like list rows so both always agree. */
export function conversationStatus(view: ConversationView): ExecutionState {
  return deriveExecutionState({ latestRun: view.header.activeRuns.at(-1) ?? view.runHistory.runs.at(-1) ?? null,
    queuedCount: view.header.queuedRuns.length, pendingRequestCount: view.header.pendingRequests.length });
}
