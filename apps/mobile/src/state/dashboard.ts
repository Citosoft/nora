import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { ComputerReport, ComputerReports, DashboardHeadline } from "@/types/dashboard.types";

/** "Good morning, Sam" by the hour of the device's clock, using the first name only. */
export function greeting(now: Date, fullName: string | null): string {
  const hour = now.getHours();
  const part = hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = fullName?.trim().split(/\s+/)[0];
  return firstName ? `${part}, ${firstName}` : part;
}

/** The computer quick actions target: the chosen default, else the first listed. */
export function primaryRuntime(runtimes: readonly RuntimeDirectoryEntry[], defaultRuntimeId: string | null): RuntimeDirectoryEntry | null {
  return runtimes.find((runtime) => runtime.installationId === defaultRuntimeId) ?? runtimes[0] ?? null;
}

/** Sums every computer's report into the line under the greeting; `computerCount` is null while the list is loading. */
export function dashboardHeadline(reports: ComputerReports, computerCount: number | null): DashboardHeadline {
  if (computerCount === null) return { text: "Finding your computers…", tone: "neutral" };
  if (computerCount === 0) return { text: "Connect a computer to get started", tone: "neutral" };
  const values = Object.values(reports);
  let needsYou = 0, working = 0, online = 0;
  for (const report of values) {
    if (report.status !== "online") continue;
    online += 1;
    needsYou += report.needsYou;
    working += report.working;
  }
  if (needsYou || working) {
    const parts = [needsYou ? `${needsYou} ${needsYou === 1 ? "needs" : "need"} you` : null, working ? `${working} running` : null];
    return { text: parts.filter(Boolean).join(" · "), tone: needsYou ? "attention" : "active" };
  }
  if (values.some((report) => report.status === "checking")) return { text: "Checking your computers…", tone: "neutral" };
  if (!online) return { text: computerCount === 1 ? "Your computer is offline" : "Your computers are offline", tone: "danger" };
  return { text: "All quiet. Nothing needs you right now.", tone: "neutral" };
}

/** The latest work chats for a computer card; a bot's direct chat lives under Bots instead. */
export function recentChats(summaries: readonly ConversationSummary[], limit: number): ConversationSummary[] {
  return summaries.filter(({ conversation }) => !conversation.direct).slice(0, limit);
}

/** Whether a card's new report changes anything, so unchanged reports don't re-render the dashboard. */
export function sameReport(left: ComputerReport | undefined, right: ComputerReport): boolean {
  if (!left || left.status !== right.status) return false;
  return left.status !== "online" || right.status !== "online" || (left.needsYou === right.needsYou && left.working === right.working);
}
