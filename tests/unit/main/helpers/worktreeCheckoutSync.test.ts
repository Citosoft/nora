import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "@main/orchestrator/createAppInitialState";
import { createWorktreeCheckoutSync, readyWorktreePaths } from "@main/helpers/worktreeCheckoutSync";
import type { AppState, ProjectSummary, WorkspaceSummary, WorktreeRecord } from "@shared/appTypes";

const project = (id: string, ssh = false) => ({ id, rootPath: `/${id}`, location: ssh ? { kind: "ssh" } : { kind: "local" } }) as ProjectSummary;
const worktree = (path: string, status: WorktreeRecord["status"] = "ready") => ({ id: path, path, status }) as WorktreeRecord;
const summary = (entry: ProjectSummary, worktrees: WorktreeRecord[]) => ({ project: entry, worktrees }) as unknown as WorkspaceSummary;

test("readyWorktreePaths uses the open project's live worktrees and other projects' summaries", () => {
  const state: AppState = { ...createInitialState(), project: project("a"), worktrees: [worktree("/w/2"), worktree("/w/1"), worktree("/w/3", "creating")],
    workspaces: [summary(project("a"), []), summary(project("b"), [worktree("/b/1")])] };
  assert.deepEqual(readyWorktreePaths(state, "a"), ["/w/1", "/w/2"]);
  assert.deepEqual(readyWorktreePaths(state, "b"), ["/b/1"]);
  assert.deepEqual(readyWorktreePaths(state, "missing"), []);
});

test("worktree checkout sync runs per local project only when its worktrees change, retrying after failures", async () => {
  const synced: string[] = [];
  let fail = false;
  const errors: unknown[] = [];
  const sync = createWorktreeCheckoutSync({ sync: async (id) => { synced.push(id); if (fail) throw new Error("boom"); }, onError: (error) => errors.push(error) });
  const base: AppState = { ...createInitialState(), project: project("a"), worktrees: [worktree("/w/1")], workspaces: [summary(project("remote", true), [])] };
  sync(base);
  sync({ ...base });
  assert.deepEqual(synced, ["a"], "SSH projects and unchanged lists are skipped");
  fail = true;
  sync({ ...base, worktrees: [worktree("/w/1"), worktree("/w/2")] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(errors.length, 1);
  fail = false;
  sync({ ...base, worktrees: [worktree("/w/1"), worktree("/w/2")] });
  assert.deepEqual(synced, ["a", "a", "a"], "A failed sync is retried even though the list is unchanged");
});
