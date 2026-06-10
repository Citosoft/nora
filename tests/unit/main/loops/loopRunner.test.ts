import { createLoopRunner } from "@main/loops/loopRunner";
import type { LoopStore } from "@main/types/loopStore.types";
import type { LoopHeadlessExecutionResult } from "@shared/types/loopHeadlessLaunch.types";
import type { AppState, LoopDefinition, LoopRun } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const definition: LoopDefinition = {
  id: "loop-1", projectId: "project-1", name: "Delivery",
  writer: { id: "writer", kind: "writer", name: "Writer", toolId: "codex", instructions: "Implement and verify." },
  reviewers: [], limits: { maxIterations: 2, maxDurationMs: 3_600_000, roleTimeoutMs: 60_000 },
  createdAt: "2026-06-09T00:00:00.000Z", updatedAt: "2026-06-09T00:00:00.000Z"
};

test("loop runner completes when the headless writer returns a matching completion marker", async () => {
  const definitions = new Map([[definition.id, definition]]);
  const runs = new Map<string, LoopRun>();
  const requestedBranches: string[] = [];
  const store: LoopStore = {
    listDefinitions: async () => [...definitions.values()],
    saveDefinition: async (value) => { definitions.set(value.id, value); },
    deleteDefinition: async (_projectId, id) => { definitions.delete(id); },
    listRuns: async () => [...runs.values()],
    getRun: async (_projectId, id) => runs.get(id) ?? null,
    saveRun: async (value) => {
      if (value.status === "preparing" && value.outputLog.includes("Creating worktree")) {
        await new Promise<void>((resolve) => setTimeout(resolve, 40));
      }
      runs.set(value.id, structuredClone(value));
    },
    deleteRun: async (_projectId, id) => { runs.delete(id); }
  };
  let id = 0;
  const runner = createLoopRunner({
    store,
    nowIso: () => new Date().toISOString(),
    randomId: () => `id-${++id}`,
    getSnapshot: (): AppState => ({
      screen: "workspace",
      project: {
        id: "project-1",
        name: "Demo",
        rootPath: "/tmp/project",
        baseBranch: "main",
        gitCommonDir: ".git",
        framework: null,
        platform: "local",
        createdAt: "2026-06-09T00:00:00.000Z",
        updatedAt: "2026-06-09T00:00:00.000Z",
        lastOpenedAt: "2026-06-09T00:00:00.000Z",
        location: { kind: "local" }
      },
      projectBranches: [],
      currentSessionId: null,
      sessions: [],
      worktrees: [],
      workspaces: [],
      recentProjects: [],
      focusedAgentId: null,
      focusedTerminalId: null,
      selectedChangePath: null,
      selectedCommitHash: null,
      selectedCommit: null,
      changesRoot: null,
      changes: [],
      commitHistory: [],
      activeRemoteMounts: [],
      projectScripts: [],
      defaultWorktreePrepareCommand: null,
      agents: [],
      terminals: [],
      terminalShells: [],
      agentCatalog: [],
      agentSkillCatalogs: [],
      errorMessage: null
    }),
    prepareWorktree: async ({ onProgress, payload }) => {
      requestedBranches.push(`${payload.worktreeBranch?.prefix}/${payload.worktreeBranch?.name}`);
      await onProgress?.("Creating worktree loop/delivery…");
      return {
        sessionId: "session-1",
        worktreeId: "worktree-1",
        worktreePath: "/tmp/worktree"
      };
    },
    resolveLoopTool: () => ({ detectedCommand: "codex", env: {} }),
    headlessExecutor: {
      execute: ({ command, onOutput }) => {
        const token = command.match(/token="([^"]+)"/)?.[1] ?? "";
        onOutput("Running headless turn…\n");
        return {
          abort: () => {},
          result: Promise.resolve({
            output: `<nora-loop-result token="${token}" outcome="complete">done</nora-loop-result>`,
            exitCode: 0,
            aborted: false
          })
        };
      }
    },
    notifyRunChanged: () => {},
    notifyRunOutput: () => {},
    resolveWorkspaceStatePath: async (_projectId, relativePath) => `/tmp/worktree/${relativePath}`
  });

  await store.saveRun({
    id: "orphaned-run",
    projectId: "project-1",
    definitionId: definition.id,
    definition,
    objective: "Recover me",
    specPath: null,
    taskPath: null,
    handoffPath: null,
    limits: definition.limits,
    status: "running",
    stopReason: null,
    sessionId: "session-old",
    worktreeId: "worktree-old",
    worktreePath: "/tmp/old-worktree",
    outputLog: "",
    outputEvents: [],
    roles: [],
    iterations: [],
    events: [],
    activeRoleId: null,
    activeToken: null,
    createdAt: definition.createdAt,
    startedAt: definition.createdAt,
    updatedAt: definition.updatedAt,
    completedAt: null
  });
  const recovered = await runner.getRun("project-1", "orphaned-run");
  assert.equal(recovered?.status, "paused");
  assert.match(recovered?.stopReason ?? "", /closed/);

  const started = await runner.startRun({
    projectId: "project-1",
    definitionId: definition.id,
    objective: "Ship feature",
    target: { kind: "new" },
    worktreeBranch: { prefix: "loop", name: "Delivery" }
  });
  const deadline = Date.now() + 3_000;
  let completed: LoopRun | null = null;
  while (Date.now() < deadline) {
    completed = await store.getRun("project-1", started.id);
    if (completed?.status === "completed") {
      break;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(completed?.status, "completed");
  assert.equal(completed?.outputEvents.some((event) => event.kind === "result"), true);
  assert.equal(completed?.iterations[0]?.writerResult?.outcome, "complete");
  assert.equal(requestedBranches[0], `loop/Delivery-${started.id.slice(0, 8)}`);
  assert.match(completed?.outputLog ?? "", /Creating worktree/);
  assert.match(completed?.outputLog ?? "", /headless/i);
  if (!completed) {
    assert.fail("Expected the loop run to complete.");
  }
  await store.saveRun({ ...completed, status: "running" });
  await assert.rejects(
    runner.deleteRun("project-1", started.id),
    /Pause or cancel/
  );
  await store.saveRun(completed);
  await runner.deleteRun("project-1", started.id);
  assert.equal(await store.getRun("project-1", started.id), null);

  const repeated = await runner.startRun({
    projectId: "project-1",
    definitionId: definition.id,
    objective: "Ship feature again",
    target: { kind: "new" },
    worktreeBranch: { prefix: "loop", name: "Delivery" }
  });
  const repeatedDeadline = Date.now() + 3_000;
  while (Date.now() < repeatedDeadline) {
    const current = await store.getRun("project-1", repeated.id);
    if (current?.status === "completed") {
      break;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(requestedBranches.length, 2);
  assert.notEqual(requestedBranches[0], requestedBranches[1]);
  runner.dispose();
});

test("pausing aborts the active agent turn and settles the run as paused", async () => {
  const runs = new Map<string, LoopRun>();
  const store: LoopStore = {
    listDefinitions: async () => [definition],
    saveDefinition: async () => undefined,
    deleteDefinition: async () => undefined,
    listRuns: async () => [...runs.values()],
    getRun: async (_projectId, id) => runs.get(id) ?? null,
    saveRun: async (value) => { runs.set(value.id, structuredClone(value)); },
    deleteRun: async (_projectId, id) => { runs.delete(id); }
  };
  let id = 0;
  let aborted = false;
  let resolveExecution: ((value: LoopHeadlessExecutionResult) => void) | null = null;
  const executionResult = new Promise<LoopHeadlessExecutionResult>((resolve) => {
    resolveExecution = resolve;
  });
  const runner = createLoopRunner({
    store,
    nowIso: () => new Date().toISOString(),
    randomId: () => `pause-id-${++id}`,
    getSnapshot: () => { throw new Error("Unused in loop runner test."); },
    prepareWorktree: async () => ({
      sessionId: "session-1",
      worktreeId: "worktree-1",
      worktreePath: "/tmp/worktree"
    }),
    resolveLoopTool: () => ({ detectedCommand: "codex", env: {} }),
    headlessExecutor: {
      execute: () => ({
        abort: () => {
          aborted = true;
          resolveExecution?.({ output: "partial output", exitCode: null, aborted: true });
        },
        result: executionResult
      })
    },
    notifyRunChanged: () => undefined,
    notifyRunOutput: () => undefined,
    resolveWorkspaceStatePath: async (_projectId, relativePath) => `/tmp/worktree/${relativePath}`
  });

  const started = await runner.startRun({
    projectId: "project-1",
    definitionId: definition.id,
    objective: "Pause this run",
    target: { kind: "new" }
  });
  const activeDeadline = Date.now() + 1_000;
  while (Date.now() < activeDeadline) {
    const current = await store.getRun("project-1", started.id);
    if (current?.activeRoleId === "writer") break;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }

  const pauseRequested = await runner.pauseRun("project-1", started.id);
  assert.equal(pauseRequested.status, "pausing");
  const pausedDeadline = Date.now() + 1_000;
  let paused: LoopRun | null = null;
  while (Date.now() < pausedDeadline) {
    paused = await store.getRun("project-1", started.id);
    if (paused?.status === "paused") break;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }

  assert.equal(aborted, true);
  assert.equal(paused?.status, "paused");
  assert.equal(paused?.activeRoleId, null);
  assert.equal(paused?.events.at(-1)?.kind, "paused");
  assert.match(paused?.outputLog ?? "", /Writer stopped/);
  runner.dispose();
});
