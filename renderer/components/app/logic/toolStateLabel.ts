import type { ToolState } from "@shared/types/conversation/contracts.types";

/** User-facing status for a tool or agent run. */
export function toolStateLabel(state: ToolState): string {
  switch (state) {
    case "running": return "Running";
    case "completed": return "Done";
    case "unconfirmed": return "Result unconfirmed";
    case "interrupted": return "Stopped";
    case "declined": return "Declined";
    case "failed": return "Failed";
  }
}
