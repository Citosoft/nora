import type { ToolState } from "./contracts.types";

/** Live provider activity, including the gap between steps. */
export interface TurnActivity {
  kind: "starting" | "thinking" | "waiting" | "stopping" | "searching" | "connecting" | "working" | "composing";
  label: string;
}

export interface ToolHistorySummary { label: string; state: ToolState; count: number; failedCount: number; }
