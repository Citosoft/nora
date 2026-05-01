import {
  countSelectedAgentContextGroups,
  countSelectedAgentContextGroupsForSource,
  estimateSelectedAgentContext,
  isAgentContextGroupSelected,
  mergeAgentContextPickerSources,
  toggleAgentContextGroupSelection
} from "@/components/app/logic/agentContextSelections";
import type { AgentContextSelection, AgentContextSourceSummary } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const source: AgentContextSourceSummary = {
  agentId: "agent-1",
  agentName: "Agent One",
  toolId: "codex",
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

test("toggle selection preserves externalHarness metadata on the same synthetic source id", () => {
  const externalSelection: AgentContextSelection = {
    sourceAgentId: "external-harness:codex:abc",
    entryIds: ["e1", "e2"],
    externalHarness: {
      toolId: "codex",
      toolLabel: "Codex",
      conversationId: "thr-1",
      primaryArtifactPath: "/tmp/rollout.jsonl",
      sessionLabel: "Codex · thr-1",
      workspacePath: "/tmp/ws"
    }
  };
  const toggled = toggleAgentContextGroupSelection(
    [externalSelection],
    externalSelection.sourceAgentId,
    { entryIds: ["e1"] }
  );
  assert.equal(toggled.length, 1);
  assert.deepEqual(toggled[0]?.externalHarness, externalSelection.externalHarness);
  assert.ok(toggled[0]?.entryIds.includes("e2"));
});

test("mergeAgentContextPickerSources appends a synthetic Nora-shaped row for external-only selections", () => {
  const externalSelection: AgentContextSelection = {
    sourceAgentId: "external-harness:codex:abc",
    entryIds: ["e1", "e2"],
    externalHarness: {
      toolId: "codex",
      toolLabel: "Codex",
      conversationId: "thr-1",
      primaryArtifactPath: "/tmp/rollout.jsonl",
      sessionLabel: "Codex · thr-1",
      workspacePath: "/tmp/ws"
    }
  };
  const merged = mergeAgentContextPickerSources([], [externalSelection]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.agentId, externalSelection.sourceAgentId);
  assert.equal(merged[0]?.entryGroups.length, 1);
  assert.deepEqual(merged[0]?.entryGroups[0]?.entryIds, ["e1", "e2"]);
});

test("count and estimate include external harness selections not present in Nora sources", () => {
  const externalSelection: AgentContextSelection = {
    sourceAgentId: "external-harness:codex:abc",
    entryIds: ["e1", "e2"],
    externalHarness: {
      toolId: "codex",
      toolLabel: "Codex",
      conversationId: "thr-1",
      primaryArtifactPath: "/tmp/rollout.jsonl",
      sessionLabel: "Codex · thr-1",
      workspacePath: "/tmp/ws"
    }
  };
  assert.equal(countSelectedAgentContextGroups([source], [externalSelection]), 1);
  assert.deepEqual(estimateSelectedAgentContext([source], [externalSelection]), {
    characters: 1000,
    estimatedTokens: 250
  });
});
