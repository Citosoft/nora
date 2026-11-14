import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceWorktree } from "@main/orchestrator/createWorkspaceWorktree";
import { createInitialState } from "@main/orchestrator/createAppInitialState";
import type { CreateWorkspaceWorktreeDeps } from "@main/types/createWorkspaceWorktree.types";
import { parseCreateWorktreePayload } from "@shared/worktreeCreation";
import type { AppState, ProjectSummary, SessionRecord, WorktreeRecord } from "@shared/appTypes";

function fixture() {
  const time = "2026-11-13T12:00:00Z";
  const project: ProjectSummary = { id: "project", name: "Project", rootPath: "/project", gitCommonDir: "/project/.git", versionControl: "git", baseBranch: "main", framework: null, platform: "darwin", createdAt: time, updatedAt: time, lastOpenedAt: time };
  const session: SessionRecord = { id: "session", projectId: project.id, name: "Default", status: "active", focusedWorktreeId: "root", createdAt: time, updatedAt: time, lastUsedAt: time };
  const planned: WorktreeRecord = { id: "created", projectId: project.id, sessionId: session.id, branch: "generated", path: "/managed/checkout", createdFromRef: "HEAD", status: "creating", writerAgentId: null, readerAgentIds: [], terminalSessionIds: [], scripts: [], createdAt: time, updatedAt: time, lastUsedAt: time };
  let state: AppState = { ...createInitialState(), project, sessions: [session], currentSessionId: session.id };
  const created: WorktreeRecord[] = [];
  const validated: string[] = [];
  let persisted = 0;
  const deps: CreateWorkspaceWorktreeDeps = {
    getSnapshot: () => state,
    validateBranch: async (_project, branch) => { validated.push(branch); },
    worktrees: {
      createInitialSessionState: async () => ({ projectId: project.id, session, agents: [], terminals: [], worktrees: [], focusedAgentId: null, focusedTerminalId: null, selectedChangePath: null, selectedCommitHash: null }),
      planManagedWorktree: () => planned,
      createWorktree: async (_project, _session, _name, next) => {
        assert.ok(next);
        const ready: WorktreeRecord = { ...next, status: "ready" };
        created.push(ready);
        return ready;
      },
      upsertSession: (items, next) => [next, ...items.filter((entry) => entry.id !== next.id)],
      upsertWorktree: (items, next) => [next, ...items.filter((entry) => entry.id !== next.id)],
      upsertWorkspaceSummary: (items, next) => [next, ...items.filter((entry) => entry.project.id !== next.project.id)]
    },
    updateState: (update) => { state = update(state); },
    persistWorkspaceState: async () => { persisted++; },
    refreshProjectState: async () => state
  };
  return { deps, project, session, created, validated, state: () => state, persisted: () => persisted };
}

test("standalone worktree creation keeps the exact requested branch without opening an agent or terminal", async () => {
  const f = fixture();
  const next = await createWorkspaceWorktree({ projectId: "project", branch: " feature/Keep-Case " }, f.deps);
  assert.deepEqual(f.validated, ["feature/Keep-Case"]);
  assert.equal(f.created[0].branch, "feature/Keep-Case");
  assert.equal(next.worktrees[0].status, "ready");
  assert.deepEqual(next.agents, []);
  assert.deepEqual(next.terminals, []);
  assert.equal(next.sessions[0].focusedWorktreeId, "root");
  assert.equal(next.currentSessionId, "session");
  assert.equal(next.workspaces[0].worktrees[0].id, "created");
  assert.equal(f.persisted(), 1);
});

test("invalid branch validation stops creation before checkout or state changes", async () => {
  const f = fixture();
  f.deps.validateBranch = async () => { throw new Error("Invalid branch"); };
  await assert.rejects(createWorkspaceWorktree({ projectId: "project", branch: "bad branch" }, f.deps), /Invalid branch/);
  assert.equal(f.created.length, 0);
  assert.deepEqual(f.state().worktrees, []);
  assert.equal(f.persisted(), 0);
});

test("wrong workspaces, plain folders and duplicate branches cannot create a checkout", async () => {
  const f = fixture();
  await assert.rejects(createWorkspaceWorktree({ projectId: "other", branch: "feature/new" }, f.deps), /no longer active/);
  f.project.versionControl = "none";
  await assert.rejects(createWorkspaceWorktree({ projectId: "project", branch: "feature/new" }, f.deps));
  f.project.versionControl = "git";
  await createWorkspaceWorktree({ projectId: "project", branch: "feature/new" }, f.deps);
  await assert.rejects(createWorkspaceWorktree({ projectId: "project", branch: "feature/new" }, f.deps), /already uses/);
  assert.equal(f.created.length, 1);
});

test("Git creation failure never publishes a phantom worktree", async () => {
  const f = fixture();
  f.deps.worktrees.createWorktree = async () => { throw new Error("Branch already exists"); };
  await assert.rejects(createWorkspaceWorktree({ projectId: "project", branch: "existing" }, f.deps), /already exists/);
  assert.deepEqual(f.state().worktrees, []);
  assert.equal(f.persisted(), 0);
});

test("worktree IPC payloads reject malformed input without coercing or accepting extra launch options", () => {
  assert.deepEqual(parseCreateWorktreePayload({ projectId: " project ", branch: " feature/new " }), { projectId: "project", branch: "feature/new" });
  for (const invalid of [null, {}, { projectId: "project", branch: " " }, { projectId: "project", branch: "a".repeat(201) }, { projectId: "project", branch: "feature/new", launchThread: true }]) {
    assert.throws(() => parseCreateWorktreePayload(invalid), /branch name/);
  }
});
