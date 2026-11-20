import type { InboxItem } from "@shared/types/inbox/inbox.types";
import type { InboxEntryItem, InboxEntryPresentation } from "@/components/app/types/inbox.types";

const OUTCOME_WORDS = Object.freeze({ completed: "Finished", failed: "Failed", interrupted: "Stopped" });

/** Headline, detail and main action for an update, a paused workflow or a connector; requests have their own row. */
export function presentInboxEntry(item: InboxEntryItem): InboxEntryPresentation {
  switch (item.kind) {
    case "outcome": {
      const state = item.run.state === "failed" || item.run.state === "interrupted" ? item.run.state : "completed";
      return { title: item.conversation.title, detail: item.preview ?? (state === "failed" ? item.run.failure?.message ?? null : null) ?? OUTCOME_WORDS[state],
        tone: state === "failed" ? "danger" : state === "interrupted" ? "warning" : "default", actionLabel: "Open" };
    }
    case "workflow": return item.status === "paused"
      ? { title: `${item.workflowName} paused`, detail: item.stopReason ?? item.objective, tone: "warning", actionLabel: "Review" }
      : { title: `${item.workflowName} finished`, detail: item.objective || null, tone: "default", actionLabel: "Open" };
    case "connector": return { title: `${item.name} needs you to sign in`, detail: "Sign in again so your agents can use its tools.", tone: "warning", actionLabel: "Sign in" };
    case "alert": return { title: item.title, detail: item.detail ?? item.appName, tone: item.tier === "needs-you" ? "warning" : "default", actionLabel: "Open app" };
  }
}

/** The outcome word for an update's status label, when it has one. */
export function outcomeLabel(item: InboxItem): string | null {
  if (item.kind !== "outcome") return null;
  return item.run.state === "failed" || item.run.state === "interrupted" ? OUTCOME_WORDS[item.run.state] : OUTCOME_WORDS.completed;
}
