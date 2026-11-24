import type { StatusTone } from "./conversationState.types";

/** What one computer card reports to the dashboard header, so it can sum up every computer at once. */
export type ComputerReport =
  | { status: "checking" }
  | { status: "offline" }
  | { status: "online"; needsYou: number; working: number };

export type ComputerReports = Readonly<Record<string, ComputerReport>>;

export interface DashboardHeadline {
  /** One line under the greeting, e.g. "3 need you · 1 running". */
  text: string;
  tone: StatusTone;
}
