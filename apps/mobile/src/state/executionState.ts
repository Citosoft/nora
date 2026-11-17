import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ExecutionState, ExecutionStateKind, RunSnapshot, StatusTone } from "@/types/conversationState.types";

const presentation: Record<ExecutionStateKind, { label: string; tone: StatusTone }> = {
  working: { label: "Working", tone: "active" },
  "needs-approval": { label: "Needs approval", tone: "attention" },
  "needs-input": { label: "Needs your input", tone: "attention" },
  queued: { label: "Queued", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
  stopped: { label: "Stopped", tone: "neutral" },
  done: { label: "Done", tone: "success" },
  idle: { label: "No activity yet", tone: "neutral" }
};

export function executionStateOf(kind: ExecutionStateKind): ExecutionState {
  return { kind, ...presentation[kind] };
}

export function runStateKind(run: RunSnapshot): ExecutionStateKind {
  switch (run.state) {
    case "queued": return "queued";
    case "starting":
    case "running":
    case "stopping":
    case "recovering":
      return "working";
    case "awaiting-approval": return "needs-approval";
    case "awaiting-input": return "needs-input";
    case "failed": return "failed";
    case "interrupted": return "stopped";
    case "completed": return "done";
  }
}

/** Pending requests win over the run state: they are what the user must act on. */
export function deriveExecutionState(summary: Pick<ConversationSummary, "latestRun" | "queuedCount" | "pendingRequestCount">): ExecutionState {
  const run = summary.latestRun;
  const runKind = run ? runStateKind(run) : null;
  if (summary.pendingRequestCount > 0) return executionStateOf(runKind === "needs-input" ? "needs-input" : "needs-approval");
  if (runKind && runKind !== "done" && runKind !== "stopped" && runKind !== "failed") return executionStateOf(runKind);
  if (summary.queuedCount > 0) return executionStateOf("queued");
  return executionStateOf(runKind ?? "idle");
}
