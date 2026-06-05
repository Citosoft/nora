import { detectLocalAgentCatalog } from "@main/orchestrator/environmentDetection";
import assert from "node:assert/strict";
import test from "node:test";

function pathEndsWithOpencodeBin(candidate: string): boolean {
  return candidate.replace(/\\/g, "/").endsWith("/.opencode/bin/opencode");
}

test("detectLocalAgentCatalog finds OpenCode from its catalog executable candidate", async () => {
  const detections = await detectLocalAgentCatalog((paths) =>
    paths.find((candidate) => pathEndsWithOpencodeBin(candidate)) || null
  );
  const opencode = detections.find((detection) => detection.id === "opencode");

  assert.equal(opencode?.detected, true);
  assert.equal(pathEndsWithOpencodeBin(opencode?.detectedPath ?? ""), true);
});
