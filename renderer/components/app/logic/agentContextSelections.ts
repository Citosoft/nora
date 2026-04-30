import type { AgentContextSelection, AgentContextSourceSummary } from "@shared/appTypes";

export function isAgentContextEntrySelected(
  selections: AgentContextSelection[],
  sourceAgentId: string,
  entryId: string
): boolean {
  return selections.some((selection) => selection.sourceAgentId === sourceAgentId && selection.entryIds.includes(entryId));
}

export function toggleAgentContextEntrySelection(
  selections: AgentContextSelection[],
  sourceAgentId: string,
  entryId: string
): AgentContextSelection[] {
  const next = new Map(selections.map((selection) => [selection.sourceAgentId, selection.entryIds]));
  const currentEntryIds = [...(next.get(sourceAgentId) || [])];
  const currentSet = new Set(currentEntryIds);

  if (currentSet.has(entryId)) {
    currentSet.delete(entryId);
  } else {
    currentSet.add(entryId);
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

export function countSelectedAgentContextEntries(selections: AgentContextSelection[]): number {
  return selections.reduce((total, selection) => total + selection.entryIds.length, 0);
}

export function estimateSelectedAgentContext(
  sources: AgentContextSourceSummary[],
  selections: AgentContextSelection[]
): { characters: number; estimatedTokens: number } {
  const selectedEntryIdsBySource = new Map(selections.map((selection) => [selection.sourceAgentId, new Set(selection.entryIds)]));
  const characters = sources.reduce((total, source) => {
    const selectedEntryIds = selectedEntryIdsBySource.get(source.agentId);
    if (!selectedEntryIds) {
      return total;
    }

    return total + source.latestEntries.reduce(
      (sourceTotal, entry) => sourceTotal + (selectedEntryIds.has(entry.id) ? entry.estimate.characters : 0),
      0
    );
  }, 0);

  return {
    characters,
    estimatedTokens: Math.ceil(characters / 4)
  };
}
