import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ReferenceEntry } from "@main/types/execution/threadReferences.types";

/** Share visible conversation and outcomes, never native reasoning or executable tool state. */
export function referenceEntry(item: TimelineItem): ReferenceEntry | null {
  switch (item.kind) {
    case "message": return { title: `${item.role} message${item.complete ? "" : " (incomplete)"}`, text: item.text };
    case "tool": return { title: `Tool: ${item.label} (${item.state})`,
      text: [item.details?.input ? `Input: ${item.details.input}` : "", `State: ${item.state}`, item.output].filter(Boolean).join("\n\n") };
    case "plan": return { title: "Plan", text: item.steps.map((step) => `[${step.state}] ${step.text}`).join("\n") };
    case "changes": return { title: "Changed files", text: item.paths.join("\n") };
    case "subagent": return { title: `Subagent: ${item.label} (${item.state})`, text: [item.prompt, item.result].filter(Boolean).join("\n\n") };
    case "milestone": return { title: "Conversation milestone", text: item.text };
    case "connector-sign-in":
    case "review":
    case "reasoning": return null;
  }
}
