import { detectLocalAgentCatalog } from "@main/orchestrator/environmentDetection";
import assert from "node:assert/strict";
import test from "node:test";

test("detectLocalAgentCatalog finds OpenCode from its catalog executable candidate", async () => {
  const detections = await detectLocalAgentCatalog((paths) =>
    paths.find((candidate) => candidate.endsWith("/.opencode/bin/opencode")) || null
  );
  const opencode = detections.find((detection) => detection.id === "opencode");

  assert.equal(opencode?.detected, true);
  assert.equal(opencode?.detectedPath?.endsWith("/.opencode/bin/opencode"), true);
});
