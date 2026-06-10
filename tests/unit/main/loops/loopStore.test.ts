import { createLoopStore } from "@main/loops/loopStore";
import type { LoopDefinition, LoopRun } from "@shared/appTypes";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const definition: LoopDefinition = {
  id: "loop-1", projectId: "project-1", name: "Loop",
  writer: { id: "writer", kind: "writer", name: "Writer", toolId: "codex", instructions: "Implement" },
  reviewers: [], limits: { maxIterations: 10, maxDurationMs: 3_600_000, roleTimeoutMs: 60_000 },
  createdAt: "2026-06-09T00:00:00.000Z", updatedAt: "2026-06-09T00:00:00.000Z"
};

function run(status: LoopRun["status"]): LoopRun {
  return {
    id: "run-1", projectId: "project-1", definitionId: definition.id, definition, objective: "Goal",
    specPath: null, taskPath: null, limits: definition.limits, status,
    stopReason: null, sessionId: null, worktreeId: null, worktreePath: null, outputLog: "", outputEvents: [], roles: [], iterations: [], events: [],
    activeRoleId: null, activeToken: null, createdAt: definition.createdAt, startedAt: definition.createdAt,
    updatedAt: definition.updatedAt, completedAt: null
  };
}

test("loop store persists definitions and run state without changing lifecycle status", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-loop-store-"));
  try {
    const store = createLoopStore({ resolveStatePath: async (_projectId, relativePath) => path.join(root, relativePath) });
    await store.saveDefinition(definition);
    await store.saveRun(run("running"));
    assert.deepEqual(await store.listDefinitions("project-1"), [definition]);
    const loaded = await store.getRun("project-1", "run-1");
    assert.equal(loaded?.status, "running");
    assert.equal(loaded?.stopReason, null);
    await store.deleteRun("project-1", "run-1");
    assert.equal(await store.getRun("project-1", "run-1"), null);
    await store.deleteDefinition("project-1", definition.id);
    assert.deepEqual(await store.listDefinitions("project-1"), []);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("loop store loads legacy runs without normalized output events", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-loop-store-legacy-"));
  try {
    const store = createLoopStore({ resolveStatePath: async (_projectId, relativePath) => path.join(root, relativePath) });
    const { outputEvents: _outputEvents, ...legacyRun } = run("completed");
    const runDirectory = path.join(root, ".nora/loops/runs");
    await fs.mkdir(runDirectory, { recursive: true });
    await fs.writeFile(path.join(runDirectory, "run-1.json"), JSON.stringify(legacyRun), "utf8");

    const loaded = await store.getRun("project-1", "run-1");
    assert.deepEqual(loaded?.outputEvents, []);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
