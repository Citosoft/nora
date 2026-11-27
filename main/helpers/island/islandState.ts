import path from "node:path";
import { ISLAND_MAX_ITEMS } from "@shared/island/contracts";
import type { IslandCounts, IslandItem, IslandPhase, IslandState } from "@shared/types/island/island.types";
import type { ActiveWorkCount, ActiveWorkItem } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

const PHASE_ORDER: Readonly<Record<IslandPhase, number>> = { waiting: 0, running: 1, queued: 2 };

function targetKey(item: ActiveWorkItem): string {
  return item.target.kind === "thread" ? `thread:${item.target.conversationId}` : `agent:${item.target.agentId}`;
}

function toIslandItem(item: ActiveWorkItem): IslandItem {
  return { key: targetKey(item), title: item.title, workspaceName: path.basename(item.workspace) || item.workspace,
    phase: item.phase, status: item.status, identity: item.identity, target: item.target };
}

function countPhases(items: readonly ActiveWorkItem[]): IslandCounts {
  const counts: IslandCounts = { waiting: 0, running: 0, queued: 0, total: items.length };
  for (const item of items) counts[item.phase] += 1;
  return counts;
}

/** Anything waiting on the user first, then running, then queued; the most recently active first within each. */
function compareWork(left: ActiveWorkItem, right: ActiveWorkItem): number {
  return PHASE_ORDER[left.phase] - PHASE_ORDER[right.phase] || right.activeAt.localeCompare(left.activeAt);
}

/** What the island shows for the current work; its lead item is the one the collapsed island names. */
export function buildIslandState(work: ActiveWorkCount): IslandState {
  const items = [...work.items].sort(compareWork);
  return { counts: countPhases(items), items: items.slice(0, ISLAND_MAX_ITEMS).map(toIslandItem), headline: items[0]?.phase ?? null };
}
