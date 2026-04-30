import type { AgentContextEntryGroup, AgentContextSelection, AgentContextSourceSummary } from "@shared/appTypes";

function buildSelectedEntryIdsBySource(
  selections: AgentContextSelection[]
): Map<string, Set<string>> {
  return new Map(selections.map((selection) => [selection.sourceAgentId, new Set(selection.entryIds)]));
}

export function isAgentContextGroupSelected(
  selections: AgentContextSelection[],
  sourceAgentId: string,
  group: Pick<AgentContextEntryGroup, "entryIds">
): boolean {
  const selectedEntryIds = buildSelectedEntryIdsBySource(selections).get(sourceAgentId);
  return !!selectedEntryIds && group.entryIds.every((entryId) => selectedEntryIds.has(entryId));
}

export function toggleAgentContextGroupSelection(
  selections: AgentContextSelection[],
  sourceAgentId: string,
  group: Pick<AgentContextEntryGroup, "entryIds">
): AgentContextSelection[] {
  const next = new Map(selections.map((selection) => [selection.sourceAgentId, selection.entryIds]));
  const currentEntryIds = [...(next.get(sourceAgentId) || [])];
  const currentSet = new Set(currentEntryIds);
  const isFullySelected = group.entryIds.every((entryId) => currentSet.has(entryId));

  if (isFullySelected) {
    group.entryIds.forEach((entryId) => currentSet.delete(entryId));
  } else {
    group.entryIds.forEach((entryId) => currentSet.add(entryId));
  }

  if (currentSet.size === 0) {
    next.delete(sourceAgentId);
  } else {
    next.set(sourceAgentId, [...currentSet]);
  }

  return [...next.entries()].map(([nextSourceAgentId, entryIds]) => ({
    sourceAgentId: nextSourceAgentId,
    entryIds
  }));
}

export function countSelectedAgentContextGroups(
  sources: AgentContextSourceSummary[],
  selections: AgentContextSelection[]
): number {
  return sources.reduce(
    (total, source) => total + source.entryGroups.filter((group) => isAgentContextGroupSelected(selections, source.agentId, group)).length,
    0
  );
}

export function countSelectedAgentContextGroupsForSource(
  source: AgentContextSourceSummary,
  selections: AgentContextSelection[]
): number {
  return source.entryGroups.filter((group) => isAgentContextGroupSelected(selections, source.agentId, group)).length;
}

export function estimateSelectedAgentContext(
  sources: AgentContextSourceSummary[],
  selections: AgentContextSelection[]
): { characters: number; estimatedTokens: number } {
  const selectedEntryIdsBySource = buildSelectedEntryIdsBySource(selections);
  const characters = sources.reduce((total, source) => {
    const selectedEntryIds = selectedEntryIdsBySource.get(source.agentId);
    if (!selectedEntryIds) {
      return total;
    }

    return total + source.entryGroups.reduce(
      (sourceTotal, group) => sourceTotal + (group.entryIds.every((entryId) => selectedEntryIds.has(entryId)) ? group.estimate.characters : 0),
      0
    );
  }, 0);

  return {
    characters,
    estimatedTokens: Math.ceil(characters / 4)
  };
}
