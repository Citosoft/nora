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

test("getWorkspaceContextSignature returns empty string for null workspace", () => {
  assert.equal(getWorkspaceContextSignature(null), "");
});
