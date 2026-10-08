import { createInitialState } from "@main/orchestrator/createAppInitialState";
import { resolveLaunchBranchCheckout } from "@main/orchestrator/launchBranchCheckout";
import { createWorktreeSelectionHelpers } from "@main/orchestrator/worktreeSelection";
import type { CreateAgentPayload, ProjectSummary, SessionRecord, WorktreeRecord } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const timestamp = "2026-10-08T00:00:00.000Z";

function createProject(versionControl: ProjectSummary["versionControl"]): ProjectSummary {
  return {
    id: "project-1",
    name: "Project",
    rootPath: "/plain/project",
    gitCommonDir: versionControl === "git" ? "/plain/project/.git" : "",
    versionControl,
    location: { kind: "local" },
    baseBranch: versionControl === "git" ? "main" : "",
    framework: null,
    platform: "darwin",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastOpenedAt: timestamp
  };
}

const session: SessionRecord = {
  id: "session-1",
  projectId: "project-1",
  name: "Session",
  status: "active",
  createdAt: timestamp,
  updatedAt: timestamp,
  lastUsedAt: timestamp,
  focusedWorktreeId: null
};

const rootWorktree: WorktreeRecord = {
  id: "root-worktree",
  projectId: "project-1",
  sessionId: "session-1",
  path: "/plain/project",
  location: { kind: "local" },
  branch: "",
  createdFromRef: "ROOT",
  createdAt: timestamp,
  updatedAt: timestamp,
  lastUsedAt: timestamp,
  status: "ready",
  writerAgentId: null,
  readerAgentIds: [],
  terminalSessionIds: [],
  scripts: []
};

const newWorktreePayload: CreateAgentPayload = {
  toolId: "codex",
  name: "Agent",
  task: "",
  commandOverride: "",
  mode: "write",
  target: { kind: "new" }
};

function createHelpers(createdWorktrees: string[]) {
  return createWorktreeSelectionHelpers({
    nowIso: () => timestamp,
    getSnapshot: () => ({ ...createInitialState(), sessions: [session], currentSessionId: session.id }),
    createInitialSessionState: async () => {
      throw new Error("A session already exists.");
    },
    getOrCreateRootWorktree: async () => rootWorktree,
    planManagedWorktree: () => ({ ...rootWorktree, id: "planned", path: "/managed/planned" }),
    createWorktree: async (_project, _session, _agentName, planned) => {
      createdWorktrees.push(planned?.id ?? "unplanned");
      return planned ?? rootWorktree;
    },
    isWindowsUncPath: () => false
  });
}

test("resolveWorktreeForSpawn launches plain-folder agents in the project root instead of a new worktree", async () => {
  const createdWorktrees: string[] = [];
  const helpers = createHelpers(createdWorktrees);

  const result = await helpers.resolveWorktreeForSpawn(createProject("none"), newWorktreePayload, "Agent");

  assert.equal(result.worktree.id, rootWorktree.id);
  assert.equal(result.createdWorktree, false);
  assert.deepEqual(createdWorktrees, []);
});

test("resolveWorktreeForSpawn still creates new worktrees for git projects", async () => {
  const createdWorktrees: string[] = [];
  const helpers = createHelpers(createdWorktrees);

  const result = await helpers.resolveWorktreeForSpawn(createProject("git"), newWorktreePayload, "Agent");

  assert.equal(result.createdWorktree, true);
  assert.deepEqual(createdWorktrees, ["planned"]);
});

test("resolveLaunchBranchCheckout ignores branch checkouts for plain folders", () => {
  const branchCheckout = { mode: "new" as const, branchName: " feature/x " };

  assert.equal(resolveLaunchBranchCheckout(createProject("none"), branchCheckout), null);
  assert.deepEqual(resolveLaunchBranchCheckout(createProject("git"), branchCheckout), { mode: "new", branchName: "feature/x" });
  assert.equal(resolveLaunchBranchCheckout(createProject("git"), { mode: "existing", branchName: "  " }), null);
});
