import { createInitialState } from "@main/orchestrator/createAppInitialState";
import { createWorkspaceRefreshHelpers } from "@main/orchestrator/workspaceRefresh";
import type { WorkspaceRefreshHelperDeps } from "@main/types/orchestratorWorkspaceRefresh.types";
import type { AppState, ProjectSummary } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const timestamp = "2026-10-08T00:00:00.000Z";

const plainProject: ProjectSummary = {
  id: "plain-1",
  name: "plain",
  rootPath: "/plain",
  versionControl: "none",
  gitCommonDir: "",
  location: { kind: "local" },
  baseBranch: "",
  framework: null,
  platform: "darwin",
  createdAt: timestamp,
  updatedAt: timestamp,
  lastOpenedAt: timestamp
};

const failGit = async (): Promise<never> => {
  throw new Error("fatal: not a git repository (or any of the parent directories): .git");
};

function createRefreshDeps(
  getState: () => AppState,
  setState: (next: AppState) => void,
  overrides: Partial<WorkspaceRefreshHelperDeps> = {}
): WorkspaceRefreshHelperDeps {
  return {
    nowIso: () => timestamp,
    readActiveRemoteMounts: async () => [],
    getSnapshot: getState,
    setState: (partial) => setState({ ...getState(), ...partial }),
    updateState: (updater) => setState(updater(getState())),
    getActiveChangesRoot: (state) => state.project?.rootPath ?? "",
    getProjectTarget: (project) => ({ path: project.rootPath, location: project.location }),
    getWorktreeTarget: (_project, worktree) => ({ path: worktree.path, location: worktree.location }),
    readCurrentBranch: failGit,
    getGitProgressCommand: failGit,
    reportWorkspaceLoadingProgress: () => {},
    detectWorkspaceScripts: async () => [],
    detectDefaultWorktreePrepareCommand: async () => null,
    detectWorkspaceInstructionFile: async () => null,
    readCommitHistory: failGit,
    readProjectBranches: failGit,
    readGitChanges: failGit,
    normalizeLocalPath: (value) => value,
    summarizeChanges: () => null,
    isExecTimeoutError: () => false,
    describeGitTimeout: (operation) => operation,
    readCommitEntry: failGit,
    readCommitChanges: failGit,
    resolveAgentSessionTitles: async (agents) => agents,
    refreshWorkspaceSummaries: async () => {},
    loadIndexedProjects: async () => [],
    loadRecentProjects: async () => [],
    readStoredProjectFiles: async () => [],
    isWorkspaceSuppressed: () => false,
    isSuppressedWorkspaceRoot: () => false,
    getProjectMetadata: failGit,
    mergePersistedProjectSummary: (project) => project,
    saveAllProjects: async () => {},
    loadStatesForProject: async () => [],
    getLiveTerminalSnapshots: () => [],
    ...overrides
  };
}

test("refreshProjectState skips every git read for plain folders", async () => {
  let state: AppState = { ...createInitialState(), project: plainProject, changesRoot: plainProject.rootPath };
  const deps = createRefreshDeps(() => state, (next) => {
    state = next;
  });

  const next = await createWorkspaceRefreshHelpers(deps).refreshProjectState();

  assert.deepEqual(next.changes, []);
  assert.deepEqual(next.commitHistory, []);
  assert.deepEqual(next.projectBranches, []);
  assert.equal(next.project?.baseBranch, "");
  assert.equal(next.errorMessage, null);
});

test("refreshProjectState drops its results and progress when another project opens mid-refresh", async () => {
  const gitProject: ProjectSummary = {
    ...plainProject,
    id: "git-1",
    rootPath: "/repo",
    versionControl: "git",
    gitCommonDir: "/repo/.git",
    baseBranch: "main"
  };
  let state: AppState = { ...createInitialState(), project: gitProject, changesRoot: gitProject.rootPath };
  const progressProjectIds: string[] = [];
  let progressCountAtSwitch = -1;
  const deps = createRefreshDeps(() => state, (next) => {
    state = next;
  }, {
    readCurrentBranch: async () => "feature/old-repo",
    getGitProgressCommand: async (_target, args) => `git ${args.join(" ")}`,
    readCommitHistory: async () => [],
    readProjectBranches: async () => ["main"],
    readGitChanges: async () => [],
    reportWorkspaceLoadingProgress: (projectId) => {
      progressProjectIds.push(projectId);
    },
    detectWorkspaceInstructionFile: async () => {
      // The user opens a plain folder while the git project's refresh is still running.
      progressCountAtSwitch = progressProjectIds.length;
      state = { ...state, project: plainProject, changesRoot: plainProject.rootPath };
      return null;
    }
  });

  await createWorkspaceRefreshHelpers(deps).refreshProjectState();

  assert.equal(state.project?.id, plainProject.id);
  assert.equal(state.project?.baseBranch, "");
  assert.ok(progressCountAtSwitch > 0);
  assert.equal(progressProjectIds.length, progressCountAtSwitch);
});
