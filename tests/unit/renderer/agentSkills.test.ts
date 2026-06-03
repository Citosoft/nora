import { createAgentSkillCatalogMap, getAgentSkillCatalogSummaries } from "@/components/app/logic/agentSkills";
import type { AgentCatalogEntry, AgentSkillCatalog } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createTool(overrides: Partial<AgentCatalogEntry>): AgentCatalogEntry {
  return {
    id: "tool",
    label: "Tool",
    aliases: [],
    launchCommand: "tool",
    installTemplate: "npm i -g tool",
    description: "",
    usageNotes: [],
    authFields: [],
    supportsUsageStatus: false,
    usageDashboardUrl: null,
    supportsAccountSwitch: false,
    detected: true,
    enabled: true,
    detectedCommand: "tool",
    detectedPath: "/usr/bin/tool",
    detectionProbe: null,
    detectionStdout: null,
    detectionStderr: null,
    installStatus: "idle",
    installLog: [],
    config: {
      values: {},
      updatedAt: null
    },
    ...overrides
  };
}

function createCatalog(overrides: Partial<AgentSkillCatalog>): AgentSkillCatalog {
  return {
    toolId: "tool",
    supported: true,
    rootPath: "/skills",
    skills: [],
    sourceLabel: null,
    installHint: null,
    errorMessage: null,
    refreshedAt: null,
    ...overrides
  };
}

test("getAgentSkillCatalogSummaries includes shared and detected tool catalogs", () => {
  const tools: AgentCatalogEntry[] = [
    createTool({ id: "codex", label: "Codex", detected: true }),
    createTool({ id: "cursor", label: "Cursor", detected: false })
  ];

  const map = createAgentSkillCatalogMap([
    createCatalog({
      toolId: "shared-agent-skills",
      sourceLabel: "Shared Catalog",
      skills: [{ id: "s1", name: "Shared Skill", description: null, path: "", entryFilePath: "", enabled: true }]
    }),
    createCatalog({
      toolId: "codex",
      skills: [{ id: "c1", name: "Codex Skill", description: null, path: "", entryFilePath: "", enabled: true }]
    }),
    createCatalog({
      toolId: "cursor",
      skills: [{ id: "x1", name: "Cursor Skill", description: null, path: "", entryFilePath: "", enabled: true }]
    })
  ]);

  const summaries = getAgentSkillCatalogSummaries(tools, map);

  assert.deepEqual(
    summaries.map((summary) => summary.toolId),
    ["shared-agent-skills", "codex"]
  );
  assert.equal(summaries[0]?.label, "Shared Catalog");
  assert.equal(summaries[1]?.catalog.skills[0]?.name, "Codex Skill");
});

test("getAgentSkillCatalogSummaries skips unsupported catalogs", () => {
  const tools: AgentCatalogEntry[] = [createTool({ id: "codex", label: "Codex", detected: true })];

  const map = createAgentSkillCatalogMap([
    createCatalog({
      toolId: "shared-agent-skills",
      supported: false,
      skills: [{ id: "s1", name: "Shared Skill", description: null, path: "", entryFilePath: "", enabled: true }]
    }),
    createCatalog({
      toolId: "codex",
      supported: false,
      skills: [{ id: "c1", name: "Codex Skill", description: null, path: "", entryFilePath: "", enabled: true }]
    })
  ]);

  assert.deepEqual(getAgentSkillCatalogSummaries(tools, map), []);
});
