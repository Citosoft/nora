import { createDefaultWorkspaceSplitViewCollection, createDefaultWorkspaceTaskBoard } from "@shared/appTypes";
import { createWorkspaceActions, type WorkspaceActionsDependencies } from "@main/orchestrator/workspaceActions";
import type { AppState, ProjectSummary, WorkspaceTaskBoard, WorkspaceSplitViewCollection } from "@shared/appTypes";
import type { WorkspaceTarget } from "@main/types/internal.types";
import assert from "node:assert/strict";
import test from "node:test";

const target: WorkspaceTarget = {
  path: "/workspace",
  location: { kind: "local" }
};

const project: ProjectSummary = {
  id: "project-1",
  name: "workspace",
  rootPath: "/workspace",
  gitCommonDir: "/workspace/.git",
  versionControl: "git",
  baseBranch: "main",
  framework: null,
  platform: "darwin",
  createdAt: "2026-06-11T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
  lastOpenedAt: "2026-06-11T00:00:00.000Z"
};

function createWorkspaceActionsForTest(overrides: Partial<WorkspaceActionsDependencies> = {}) {
  const refreshState = {} as AppState;
  const workspaceTaskBoard: WorkspaceTaskBoard = createDefaultWorkspaceTaskBoard();
  const workspaceSplitViewCollection: WorkspaceSplitViewCollection = createDefaultWorkspaceSplitViewCollection();
  const deps: WorkspaceActionsDependencies = {
    resolveProjectSummaryById: async () => project,
    resolveWorkspaceFileTarget: (_project, rootPath) => ({
      ...target,
      path: rootPath ?? target.path
    }),
    getProjectTarget: () => target,
    getSnapshot: () => refreshState,
    setState: () => undefined,
    updateState: () => undefined,
    refreshProjectState: async () => refreshState,
    refreshWorkspaceSummaries: async () => undefined,
    nowIso: () => "2026-06-11T00:00:00.000Z",
    slugify: (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    maxWorkspaceGitStatusLines: 100,
    readWorkspaceTextFile: async () => "",
    resolveExistingWorkspaceAbsolutePath: async () => target.path,
    readWorkspaceBinaryFile: async () => Buffer.from(""),
    resolveLocalWorkspaceFilePath: async (_target, _projectId, filePath) => `${target.path}/${filePath}`,
    getWorkspaceImageMimeType: () => "image/png",
    listWorkspaceFilePaths: async () => [],
    listImportedContextBundles: async () => [],
    listWorkspaceDirectories: async () => [],
    listWorkspaceSpecs: async () => [],
    listWorkspaceNotes: async () => [],
    searchWorkspaceFiles: async () => [],
    statWorkspacePath: async () => ({ exists: false, kind: null }),
    execGit: async () => ({ stdout: "", stderr: "" }),
    listWorkspaceTasks: async () => [],
    readWorkspaceTaskBoard: async () => workspaceTaskBoard,
    writeWorkspaceTaskBoard: async () => workspaceTaskBoard,
    writeWorkspaceTextFile: async () => undefined,
    addTaskToWorkspaceTaskBoard: (board) => board,
    listWorkspaceTaskPaths: async () => [],
    readWorkspaceSplitViewCollection: async () => workspaceSplitViewCollection,
    writeWorkspaceSplitViewCollection: async () => workspaceSplitViewCollection,
    listArchivedExternalHarnessThreadKeys: async () => new Set(),
    archiveExternalHarnessThread: async () => undefined,
    saveProject: async () => undefined,
    ...overrides
  };

  return createWorkspaceActions(deps);
}

test("checkoutWorkspaceBranch checks out the requested branch and refreshes state", async () => {
  const calls: string[][] = [];
  let refreshCount = 0;
  const actions = createWorkspaceActionsForTest({
    execGit: async (_target, args) => {
      calls.push(args);
      return { stdout: "", stderr: "" };
    },
    refreshProjectState: async () => {
      refreshCount += 1;
      return {} as AppState;
    }
  });

  await actions.checkoutWorkspaceBranch({ projectId: project.id, branch: "dev" });

  assert.deepEqual(calls, [["checkout", "dev"]]);
  assert.equal(refreshCount, 1);
});

test("resolveWorkspaceFileForExternalOpen resolves document files to a local path", async () => {
  const resolved: Array<{ targetPath: string; filePath: string }> = [];
  const actions = createWorkspaceActionsForTest({
    resolveLocalWorkspaceFilePath: async (workspaceTarget, _projectId, filePath) => {
      resolved.push({ targetPath: workspaceTarget.path, filePath });
      return `/tmp/copies/${filePath}`;
    }
  });

  const localPath = await actions.resolveWorkspaceFileForExternalOpen({
    projectId: project.id,
    path: "docs/spec.pdf",
    rootPath: "/workspace-worktree"
  });

  assert.equal(localPath, "/tmp/copies/docs/spec.pdf");
  assert.deepEqual(resolved, [{ targetPath: "/workspace-worktree", filePath: "docs/spec.pdf" }]);
});

test("resolveWorkspaceFileForExternalOpen refuses files that are not documents", async () => {
  let resolveCount = 0;
  const actions = createWorkspaceActionsForTest({
    resolveLocalWorkspaceFilePath: async () => {
      resolveCount += 1;
      return "/workspace/scripts/install.sh";
    }
  });

  await assert.rejects(
    actions.resolveWorkspaceFileForExternalOpen({ projectId: project.id, path: "scripts/install.sh" }),
    /only opens document files/
  );
  assert.equal(resolveCount, 0);
});
