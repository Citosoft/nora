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

  return [...next.entries()].map(([nextSourceAgentId, entryIds]) => {
    const prior = selections.find((item) => item.sourceAgentId === nextSourceAgentId);
    return {
      sourceAgentId: nextSourceAgentId,
      entryIds,
      ...(prior?.externalHarness ? { externalHarness: prior.externalHarness } : {})
    };
  });
}

export function countSelectedAgentContextGroups(
  sources: AgentContextSourceSummary[],
  selections: AgentContextSelection[]
): number {
  const fromSources = sources.reduce(
    (total, source) =>
      total + source.entryGroups.filter((group) => isAgentContextGroupSelected(selections, source.agentId, group)).length,
    0
  );
  const externalBundles = selections.filter(
    (selection) =>
      selection.externalHarness &&
      selection.entryIds.length > 0 &&
      !sources.some((source) => source.agentId === selection.sourceAgentId)
  ).length;
  return fromSources + externalBundles;
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

  let externalCharacters = 0;
  for (const selection of selections) {
    if (!selection.externalHarness || selection.entryIds.length === 0) {
      continue;
    }
    if (sources.some((source) => source.agentId === selection.sourceAgentId)) {
      continue;
    }
    externalCharacters += selection.entryIds.length * 500;
  }
  const totalCharacters = characters + externalCharacters;

  return {
    characters: totalCharacters,
    estimatedTokens: Math.ceil(totalCharacters / 4)
  };
}

const externalHarnessPickerGroupId = (toolId: string, artifactPath: string): string =>
  `external-harness-group:${toolId}:${artifactPath}`;

/** Builds a Nora-shaped source row so the context picker can render pre-filled external harness selections. */
export const buildExternalHarnessPickerSourceSummary = (
  selection: AgentContextSelection
): AgentContextSourceSummary | null => {
  if (!selection.externalHarness || selection.entryIds.length === 0) {
    return null;
  }
  const ref = selection.externalHarness;
  const entryCount = selection.entryIds.length;
  const characters = entryCount * 500;
  const estimatedTokens = Math.ceil(characters / 4);
  return {
    agentId: selection.sourceAgentId,
    agentName: ref.sessionLabel,
    toolId: ref.toolId,
    toolLabel: ref.toolLabel,
    contextFilePath: "",
    contextEventsPath: "",
    terminalStreamPath: "",
    entryCount,
    lastUpdatedAt: null,
    latestPreview: "",
    estimate: { characters, estimatedTokens },
    entryGroups: [
      {
        id: externalHarnessPickerGroupId(ref.toolId, ref.primaryArtifactPath),
        title: "Full transcript (local CLI)",
        latestPreview: "Captured outside Nora while this tool ran in the same worktree directory.",
        lastUpdatedAt: null,
        entryCount,
        estimate: { characters, estimatedTokens },
        entryIds: [...selection.entryIds]
      }
    ]
  };
};

/** Appends synthetic source rows for `externalHarness` selections not already represented in Nora `sources`. */
export const mergeAgentContextPickerSources = (
  sources: AgentContextSourceSummary[],
  selections: AgentContextSelection[]
): AgentContextSourceSummary[] => {
  const appended: AgentContextSourceSummary[] = [];
  const seenSyntheticIds = new Set<string>();
  for (const selection of selections) {
    if (!selection.externalHarness || selection.entryIds.length === 0) {
      continue;
    }
    if (sources.some((source) => source.agentId === selection.sourceAgentId)) {
      continue;
    }
    if (seenSyntheticIds.has(selection.sourceAgentId)) {
      continue;
    }
    const synthetic = buildExternalHarnessPickerSourceSummary(selection);
    if (!synthetic) {
      continue;
    }
    seenSyntheticIds.add(selection.sourceAgentId);
    appended.push(synthetic);
  }
  return [...sources, ...appended];
};
