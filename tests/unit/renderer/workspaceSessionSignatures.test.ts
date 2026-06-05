import { getToolsSignature, getWorkspaceContextSignature } from "@/components/app/logic/workspaceSessionSignatures";
import assert from "node:assert/strict";
import test from "node:test";

test("getToolsSignature is order-stable for identical catalogs", () => {
  const tools = [
    {
      id: "a",
      label: "A",
      aliases: [],
      launchCommand: "",
      installTemplate: "",
      description: "",
      usageNotes: [],
      authFields: [],
      supportsUsageStatus: false,
      usageDashboardUrl: null,
      supportsAccountSwitch: false,
      detected: true,
      enabled: true,
      detectedCommand: null,
      detectedPath: null,
      detectionProbe: null,
      detectionStdout: null,
      detectionStderr: null,
      installStatus: "idle" as const,
      installLog: [],
      config: { values: {}, updatedAt: null }
    }
  ];
  assert.equal(getToolsSignature(tools), getToolsSignature(tools));
});

test("getToolsSignature tracks footer management capabilities", () => {
  const tool = {
    id: "codex",
    label: "Codex",
    aliases: [],
    launchCommand: "",
    installTemplate: "",
    description: "",
    usageNotes: [],
    authFields: [],
    supportsUsageStatus: false,
    usageDashboardUrl: null,
    supportsAccountSwitch: false,
    detected: true,
    enabled: true,
    detectedCommand: null,
    detectedPath: null,
    detectionProbe: null,
    detectionStdout: null,
    detectionStderr: null,
    installStatus: "idle" as const,
    installLog: [],
    config: { values: {}, updatedAt: null }
  };

  assert.notEqual(
    getToolsSignature([tool]),
    getToolsSignature([{ ...tool, supportsUsageStatus: true, supportsAccountSwitch: true }])
  );
});

test("getWorkspaceContextSignature returns empty string for null workspace", () => {
  assert.equal(getWorkspaceContextSignature(null), "");
});
