import {
  invalidateLocalAgentDetectionCache,
  isLocalAgentDetectionInFlight,
  peekLocalAgentCatalogDetections,
  resolveLocalAgentCatalogDetections
} from "@main/agentDetectionCache";
import type { AgentDetectionInfo } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createDetection(id: string, detected: boolean): AgentDetectionInfo {
  return {
    id,
    detected,
    detectedCommand: detected ? id : null,
    detectedPath: detected ? `/usr/local/bin/${id}` : null,
    detectionProbe: detected ? `command -v ${id}` : null,
    detectionStdout: detected ? `/usr/local/bin/${id}` : null,
    detectionStderr: null
  };
}

test("resolveLocalAgentCatalogDetections caches successful detections", async () => {
  invalidateLocalAgentDetectionCache();
  let detectCalls = 0;

  const detections = await resolveLocalAgentCatalogDetections(async () => {
    detectCalls += 1;
    return [createDetection("codex", true)];
  });

  assert.equal(detectCalls, 1);
  assert.deepEqual(peekLocalAgentCatalogDetections(), detections);

  const cached = await resolveLocalAgentCatalogDetections(async () => {
    detectCalls += 1;
    return [createDetection("claude", true)];
  });

  assert.equal(detectCalls, 1);
  assert.deepEqual(cached, detections);
});

test("resolveLocalAgentCatalogDetections dedupes in-flight detection", async () => {
  invalidateLocalAgentDetectionCache();
  let detectCalls = 0;
  let releaseDetect: (() => void) | undefined;
  const detectGate = new Promise<void>((resolve) => {
    releaseDetect = resolve;
  });

  const detect = async (): Promise<AgentDetectionInfo[]> => {
    detectCalls += 1;
    await detectGate;
    return [createDetection("codex", true)];
  };

  const first = resolveLocalAgentCatalogDetections(detect);
  const second = resolveLocalAgentCatalogDetections(detect);

  assert.equal(isLocalAgentDetectionInFlight(), true);
  assert.equal(detectCalls, 1);

  releaseDetect?.();
  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(detectCalls, 1);
  assert.deepEqual(firstResult, secondResult);
  assert.equal(isLocalAgentDetectionInFlight(), false);
});

test("invalidateLocalAgentDetectionCache forces a fresh detection", async () => {
  invalidateLocalAgentDetectionCache();
  let detectCalls = 0;

  await resolveLocalAgentCatalogDetections(async () => {
    detectCalls += 1;
    return [createDetection("codex", true)];
  });

  invalidateLocalAgentDetectionCache();

  await resolveLocalAgentCatalogDetections(async () => {
    detectCalls += 1;
    return [createDetection("claude", true)];
  });

  assert.equal(detectCalls, 2);
});
