import { createWorktreeLifecycleScriptRunner } from "@main/helpers/worktreeLifecycleScripts";
import type { WorkspaceTarget } from "@main/types/internal.types";
import type { ProjectSummary, WorkspaceSetupScript } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const worktree = { path: "/worktrees/feature", location: { kind: "local" as const }, branch: "feature" };

function project(scripts: WorkspaceSetupScript[] | undefined): ProjectSummary {
  return {
    id: "p1",
    name: "repo",
    rootPath: "/repo",
    versionControl: "git",
    gitCommonDir: "/repo/.git",
    baseBranch: "main",
    framework: null,
    platform: "darwin",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastOpenedAt: "2026-01-01T00:00:00.000Z",
    workspaceSetupScripts: scripts
  };
}

function script(id: string, trigger: WorkspaceSetupScript["trigger"]): WorkspaceSetupScript {
  return { id, name: id, command: `run-${id}`, trigger, origin: { kind: "user" } };
}

function createHarness(failingCommand: string | null = null) {
  const calls: Array<{ cwd: string; command: string }> = [];
  const failures: string[] = [];
  const run = createWorktreeLifecycleScriptRunner({
    runCommand: async (target: WorkspaceTarget, command: string) => {
      calls.push({ cwd: target.path, command });
      if (command === failingCommand) {
        throw Object.assign(new Error("Command failed"), { stderr: "missing package.json" });
      }
    },
    getWorktreeTarget: (_project, entry) => ({ path: entry.path, location: entry.location ?? { kind: "local" } }),
    reportFailure: (message) => failures.push(message)
  });
  return { run, calls, failures };
}

test("runs only the trigger's scripts, in order, inside the worktree", async () => {
  const { run, calls, failures } = createHarness();
  const report = await run(
    project([script("install", "worktree-create"), script("cleanup", "worktree-archive"), script("seed", "worktree-create"), script("deploy", "manual")]),
    worktree,
    "worktree-create"
  );

  assert.deepEqual(report, { kind: "succeeded", scriptCount: 2 });
  assert.deepEqual(calls, [
    { cwd: "/worktrees/feature", command: "run-install" },
    { cwd: "/worktrees/feature", command: "run-seed" }
  ]);
  assert.deepEqual(failures, []);
});

test("does nothing for workspaces without scripts for the trigger", async () => {
  const { run, calls } = createHarness();

  assert.deepEqual(await run(project(undefined), worktree, "worktree-create"), { kind: "none" });
  assert.deepEqual(await run(project([script("deploy", "manual")]), worktree, "worktree-archive"), { kind: "none" });
  assert.equal(calls.length, 0);
});

test("stops at the first failing script and reports it without throwing", async () => {
  const { run, calls, failures } = createHarness("run-install");
  const report = await run(
    project([script("install", "worktree-archive"), script("after", "worktree-archive")]),
    worktree,
    "worktree-archive"
  );

  assert.equal(report.kind, "failed");
  assert.deepEqual(calls.map((call) => call.command), ["run-install"]);
  assert.deepEqual(failures, ['Setup script "install" failed before removing worktree feature: missing package.json']);
  assert.equal(report.kind === "failed" ? report.message : null, failures[0]);
});
