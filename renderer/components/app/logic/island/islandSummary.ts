import type { IslandCounts, IslandIdentity, IslandPhase } from "@shared/types/island/island.types";
import type { BotAvatarState } from "@/components/app/types/botAvatar.types";

const PHASE_LABELS: Readonly<Record<IslandPhase, string>> = { waiting: "needs you", running: "running", queued: "queued" };
const SUMMARY_ORDER: readonly IslandPhase[] = ["waiting", "running", "queued"];

/** One line for the expanded island, for example "1 needs you · 2 running". */
export function islandSummary(counts: IslandCounts): string {
  return SUMMARY_ORDER.flatMap((phase) => counts[phase] > 0 ? [`${counts[phase]} ${PHASE_LABELS[phase]}`] : []).join(" · ");
}

/** The bot face's state for a row, so a waiting thread shows the same "needs you" ring as in the app. */
export function islandAvatarState(phase: IslandPhase): BotAvatarState {
  switch (phase) {
    case "waiting": return "waiting";
    case "running": return "thinking";
    case "queued": return "idle";
  }
}

/** Rows the island lists against the work it has; the rest appear as "+N more". */
export function islandOverflow(counts: IslandCounts, listed: number): number {
  return Math.max(0, counts.total - listed);
}

/** The name the collapsed island shows beside the notch: the bot's, or the provider's. */
export function islandIdentityName(identity: IslandIdentity): string {
  return identity.kind === "bot" ? identity.name : identity.label;
}
