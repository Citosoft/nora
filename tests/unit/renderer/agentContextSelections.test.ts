import {
  countSelectedAgentContextGroups,
  countSelectedAgentContextGroupsForSource,
  estimateSelectedAgentContext,
  isAgentContextGroupSelected,
  toggleAgentContextGroupSelection
} from "@/components/app/logic/agentContextSelections";
import type { AgentContextSelection, AgentContextSourceSummary } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const source: AgentContextSourceSummary = {
  agentId: "agent-1",
  agentName: "Agent One",
  toolLabel: "Codex",
  contextFilePath: "/tmp/context.md",
  contextEventsPath: "/tmp/context.jsonl",
  terminalStreamPath: "/tmp/terminal.log",
  entryCount: 3,
  lastUpdatedAt: "2026-04-29T10:10:00.000Z",
  latestPreview: "Latest output",
  estimate: {
    characters: 90,
    estimatedTokens: 23
  },
  entryGroups: [
    {
      id: "codex:thread-2",
      title: "Codex session thread-2",
      latestPreview: "Second group",
      lastUpdatedAt: "2026-04-29T10:10:00.000Z",
      entryCount: 1,
      estimate: {
        characters: 30,
        estimatedTokens: 8
      },
      entryIds: ["entry-3"]
    },
    {
      id: "codex:thread-1",
      title: "Codex session thread-1",
      latestPreview: "First group",
      lastUpdatedAt: "2026-04-29T10:00:00.000Z",
      entryCount: 2,
      estimate: {
        characters: 60,
        estimatedTokens: 15
      },
      entryIds: ["entry-1", "entry-2"]
    }
  ]
};

test("agent context group selection toggles full groups and estimates selected grouped context", () => {
  const initialSelections: AgentContextSelection[] = [];
  const nextSelections = toggleAgentContextGroupSelection(initialSelections, source.agentId, source.entryGroups[1]!);

  assert.equal(isAgentContextGroupSelected(nextSelections, source.agentId, source.entryGroups[1]!), true);
  assert.equal(isAgentContextGroupSelected(nextSelections, source.agentId, source.entryGroups[0]!), false);
  assert.equal(countSelectedAgentContextGroups([source], nextSelections), 1);
  assert.equal(countSelectedAgentContextGroupsForSource(source, nextSelections), 1);
  assert.deepEqual(
    estimateSelectedAgentContext([source], nextSelections),
    {
      characters: 60,
      estimatedTokens: 15
    }
  );

  const clearedSelections = toggleAgentContextGroupSelection(nextSelections, source.agentId, source.entryGroups[1]!);
  assert.deepEqual(clearedSelections, []);
});
