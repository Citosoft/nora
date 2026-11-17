import { createLoopStore } from "@main/loops/loopStore";
import type { LoopDefinition, LoopRun } from "@shared/appTypes";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const definition: LoopDefinition = {
  id: "loop-1", projectId: "project-1", name: "Loop", description: "",
  stages: [{ id: "writer", kind: "writer", name: "Writer", toolId: "codex", model: null, instructions: "Implement" }],
   limits: { maxIterations: 10, maxDurationMs: 3_600_000, roleTimeoutMs: 60_000 },
  createdAt: "2026-06-09T00:00:00.000Z", updatedAt: "2026-06-09T00:00:00.000Z"
};

function run(status: LoopRun["status"]): LoopRun {
  return {
    id: "run-1", projectId: "project-1", definitionId: definition.id, definition, objective: "Goal",
    specPath: null, taskPath: null, handoffPath: null, limits: definition.limits, status,
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

test("loop store back-fills description and role models for definitions saved before they existed", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-loop-store-"));
  try {
    const store = createLoopStore({ resolveStatePath: async (_projectId, relativePath) => path.join(root, relativePath) });
    const { description: _omitted, ...withoutDescription } = definition;
    const { model: _model, ...legacyWriter } = definition.stages[0];
    const { stages: _stages, ...legacyBase } = withoutDescription;
    const legacy = { ...legacyBase, writer: legacyWriter, reviewers: [] };
    const directory = path.join(root, ".nora/loops/definitions");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, `${definition.id}.json`), JSON.stringify(legacy), "utf8");
    assert.deepEqual(await store.listDefinitions("project-1"), [definition]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("loop store migrates old writer/reviewer run history into ordered stage results", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-loop-store-migration-"));
  try {
    const store = createLoopStore({ resolveStatePath: async (_projectId, relativePath) => path.join(root, relativePath) });
    const { stages, ...base } = definition;
    const review = { ...stages[0], id: "review", kind: "reviewer" };
    const writerResult = { roleId: stages[0].id, outcome: "complete", summary: "Implemented", completedAt: definition.updatedAt };
    const reviewResult = { roleId: review.id, outcome: "approve", summary: "Verified", completedAt: definition.updatedAt };
    const legacy = { ...run("completed"), definition: { ...base, writer: stages[0], reviewers: [review] },
      iterations: [{ number: 1, startedAt: definition.createdAt, completedAt: definition.updatedAt, writerResult, reviewerResults: [reviewResult] }] };
    const directory = path.join(root, ".nora/loops/runs");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "run-1.json"), JSON.stringify(legacy));
    const loaded = await store.getRun("project-1", "run-1");
    assert.deepEqual(loaded?.definition.stages.map((stage) => stage.id), ["writer", "review"]);
    assert.deepEqual(loaded?.iterations[0].results, [writerResult, reviewResult]);
    assert.ok(loaded && !("writer" in loaded.definition) && !("writerResult" in loaded.iterations[0]));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
