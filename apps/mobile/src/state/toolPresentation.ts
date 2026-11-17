import type { ToolState } from "@shared/types/conversation/contracts.types";
import type { StatusTone } from "@/types/conversationState.types";

export const toolStatePresentation: Record<ToolState, { label: string; tone: StatusTone }> = {
  running: { label: "Running", tone: "active" },
  completed: { label: "Done", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  declined: { label: "Declined", tone: "neutral" },
  interrupted: { label: "Stopped", tone: "neutral" },
  unconfirmed: { label: "Unconfirmed", tone: "attention" }
};

/** Long outputs are trimmed to their end (where results and errors are) so mobile rendering stays fast. */
export function tailText(text: string, maxLength = 6_000): { text: string; truncated: boolean } {
  return text.length <= maxLength ? { text, truncated: false } : { text: text.slice(-maxLength), truncated: true };
}
