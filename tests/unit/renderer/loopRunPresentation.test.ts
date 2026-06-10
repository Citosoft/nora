import { buildLoopRunOutput, buildLoopRunStages, loopRunEventStatus, parseLoopRunOutput } from "@/components/app/logic/loopRunPresentation";
import type { LoopRun } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createRun(overrides: Partial<LoopRun> = {}): LoopRun {
  return {
    id: "run-1",
    projectId: "project-1",
    definitionId: "workflow-1",
    definition: {
      id: "workflow-1",
      projectId: "project-1",
      name: "Implementation",
      writer: { id: "writer", kind: "writer", name: "Writer", toolId: "codex", instructions: "Implement" },
      reviewers: [{ id: "reviewer", kind: "reviewer", name: "Reviewer", toolId: "claude", instructions: "Review" }],
      limits: { maxIterations: 5, maxDurationMs: 60_000, roleTimeoutMs: 10_000 },
      createdAt: "2026-06-10T10:00:00.000Z",
      updatedAt: "2026-06-10T10:00:00.000Z"
    },
    objective: "Ship the feature",
    specPath: null,
    taskPath: null,
    handoffPath: null,
    limits: { maxIterations: 5, maxDurationMs: 60_000, roleTimeoutMs: 10_000 },
    status: "running",
    stopReason: null,
    sessionId: "session-1",
    worktreeId: "worktree-1",
    worktreePath: "/tmp/worktree",
    outputLog: "",
    outputEvents: [],
    roles: [
      { roleId: "writer", kind: "writer", name: "Writer", toolId: "codex", instructions: "Implement" },
      { roleId: "reviewer", kind: "reviewer", name: "Reviewer", toolId: "claude", instructions: "Review" }
    ],
    iterations: [{ number: 1, startedAt: "2026-06-10T10:00:01.000Z", completedAt: null, writerResult: null, reviewerResults: [] }],
    events: [],
    activeRoleId: "writer",
    activeToken: "token-1",
    createdAt: "2026-06-10T10:00:00.000Z",
    startedAt: "2026-06-10T10:00:01.000Z",
    updatedAt: "2026-06-10T10:00:01.000Z",
    completedAt: null,
    ...overrides
  };
}

test("parseLoopRunOutput separates markdown from completed result blocks", () => {
  const segments = parseLoopRunOutput("## Work\nDone.\n<nora-loop-result token=\"abc\" outcome=\"complete\">\n**Ready** to ship.\n</nora-loop-result>");
  assert.equal(segments.length, 2);
  assert.deepEqual(segments[0], { id: "markdown-0", kind: "markdown", markdown: "## Work\nDone.\n" });
  assert.deepEqual(segments[1], {
    id: "result-1-abc",
    kind: "result",
    token: "abc",
    outcome: "complete",
    summary: "**Ready** to ship.",
    complete: true
  });
});

test("parseLoopRunOutput keeps an unfinished result visible while it streams", () => {
  const segments = parseLoopRunOutput("\u001b[32m<nora-loop-result token=\"abc\" outcome=\"continue\">\nStill working");
  assert.deepEqual(segments, [{
    id: "result-0-abc",
    kind: "result",
    token: "abc",
    outcome: "continue",
    summary: "Still working",
    complete: false
  }]);
});

test("parseLoopRunOutput cleans legacy Codex launch envelopes and duplicate results", () => {
  const marker = '<nora-loop-result token="abc" outcome="complete">Done.</nora-loop-result>';
  const segments = parseLoopRunOutput([
    "Creating worktree…",
    "",
    "--- Implementer · iteration 1 ---",
    "$ codex exec 'full prompt that should not be shown'",
    "OpenAI Codex v0.139.0",
    "user",
    "full prompt that should not be shown",
    "codex",
    "I inspected the repository.",
    "hook: PreToolUse",
    marker,
    "tokens used",
    "1,234",
    marker,
    "[Implementer exited with code 0]"
  ].join("\n"));

  assert.equal(segments.filter((segment) => segment.kind === "result").length, 1);
  const markdown = segments.filter((segment) => segment.kind === "markdown").map((segment) => segment.markdown).join("\n");
  assert.match(markdown, /Implementer · iteration 1/);
  assert.match(markdown, /I inspected the repository/);
  assert.doesNotMatch(markdown, /full prompt that should not be shown/);
  assert.doesNotMatch(markdown, /hook:/);
});

test("buildLoopRunOutput maps normalized provider events without reparsing raw output", () => {
  const segments = buildLoopRunOutput({
    legacyOutput: "ignored raw output",
    events: [{
      id: "event-1",
      turnId: "turn-1",
      roleId: "writer",
      roleName: "Writer",
      roleKind: "writer",
      toolId: "codex",
      iteration: 1,
      createdAt: "2026-06-10T12:00:00.000Z",
      kind: "tool",
      command: "npm test",
      output: "passed",
      status: "completed"
    }]
  });

  assert.deepEqual(segments, [{
    id: "event-1",
    kind: "tool",
    command: "npm test",
    output: "passed",
    status: "completed"
  }]);
});

test("buildLoopRunStages marks the active role and pending reviewer", () => {
  const stages = buildLoopRunStages(createRun());
  assert.deepEqual(stages.map((stage) => stage.status), ["complete", "active", "pending", "pending"]);
});

test("buildLoopRunStages completes every stage for a completed run", () => {
  const stages = buildLoopRunStages(createRun({ status: "completed", stopReason: "Approved" }));
  assert.deepEqual(stages.map((stage) => stage.status), ["complete", "complete", "complete", "complete"]);
});

test("buildLoopRunStages keeps an agent error attached after the active role is cleared", () => {
  const stages = buildLoopRunStages(createRun({
    status: "paused",
    activeRoleId: null,
    events: [{
      id: "event-1",
      kind: "error",
      createdAt: "2026-06-10T10:00:02.000Z",
      message: "Writer failed",
      roleId: "writer",
      iteration: 1
    }]
  }));
  assert.equal(stages[1]?.status, "error");
});

test("loopRunEventStatus only spins for the latest active milestone", () => {
  assert.equal(loopRunEventStatus("role_started", true, "running"), "active");
  assert.equal(loopRunEventStatus("role_started", false, "running"), "complete");
  assert.equal(loopRunEventStatus("role_started", true, "completed"), "complete");
  assert.equal(loopRunEventStatus("resumed", true, "paused"), "complete");
});
