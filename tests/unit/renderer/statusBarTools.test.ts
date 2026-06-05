import { getEnabledStatusBarTools, getUsagePollingToolIds } from "@/components/app/logic/statusBarTools";
import type { AgentCatalogEntry } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createTool(overrides: Partial<AgentCatalogEntry>): AgentCatalogEntry {
  return {
    id: "codex",
    label: "Codex",
    aliases: ["codex"],
    launchCommand: "codex",
    installTemplate: "npm install -g @openai/codex",
    description: "",
    usageNotes: [],
    authFields: [],
    supportsUsageStatus: false,
    usageDashboardUrl: null,
    supportsAccountSwitch: false,
    detected: true,
    enabled: true,
    detectedCommand: "codex",
    detectedPath: "/usr/bin/codex",
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

test("getEnabledStatusBarTools returns only detected and enabled agent tools", () => {
  const tools = [
    createTool({ id: "codex", detected: true, enabled: true }),
    createTool({ id: "claude", detected: true, enabled: false }),
    createTool({ id: "grok", detected: false, enabled: true }),
    createTool({ id: "gemini", detected: false, enabled: false })
  ];

  assert.deepEqual(getEnabledStatusBarTools(tools).map((tool) => tool.id), ["codex"]);
});

test("getUsagePollingToolIds returns only available tools with inline usage support", () => {
  const tools = [
    createTool({ id: "codex", detected: true, enabled: true, supportsUsageStatus: true }),
    createTool({ id: "claude", detected: true, enabled: false, supportsUsageStatus: true }),
    createTool({ id: "cursor", detected: true, enabled: true, supportsUsageStatus: false, usageDashboardUrl: "https://www.cursor.com/dashboard" }),
    createTool({ id: "grok", detected: false, enabled: true, supportsUsageStatus: true })
  ];

  assert.deepEqual(getUsagePollingToolIds(tools), ["codex"]);
});
