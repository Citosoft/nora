import { buildChangesPanelSectionProps } from "@/components/app/logic/buildChangesPanelSectionProps";
import type { ChangesPanelSectionBuildDeps } from "@/components/app/types/changesPanelSectionBuild.types";
import { DEFAULT_APP_SETTINGS, type AppState } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createBuildDeps(
  overrides: Partial<ChangesPanelSectionBuildDeps> = {}
): ChangesPanelSectionBuildDeps {
  return {
    activeBranch: "main",
    activeChangesPanelTab: "git",
    addForgeWorkItemComment: async () => {},
    appSettingsAi: {
      ...DEFAULT_APP_SETTINGS.ai,
      apiKeys: {
        openai: "",
        anthropic: "",
        google: ""
      }
    },
    captureError: () => {},
    fileEditorActivePath: null,
    fileHandlers: {
      openFileEditor: () => {},
      onCreateFile: async () => {},
      onCreateDirectory: async () => {},
      onRenameFile: async () => {},
      onDeleteFile: async () => {}
    },
    forgeBranchPullRequestStatus: null,
    forgeOverview: null,
    forgeWorkItemDetail: null,
    handleSpawnForgeIssueAgent: async () => {},
    handleSpawnForgeReviewAgent: async () => {},
    isChangesSidebarCollapsed: false,
    isLoadingForgeOverview: false,
    linkCurrentWorkspaceToVercelProject: () => {},
    loadForgeWorkItemDetail: async () => {},
    openFileEditor: () => {},
    openForgeViewer: () => {},
    openCreateAgentDialog: () => {},
    openSettingsPage: () => {},
    performForgeWorkItemAction: () => {},
    redeployVercelDeployment: async () => {},
    redeployingVercelDeploymentId: null,
    refreshForgeOverview: () => {},
    refreshVercelDeployments: () => {},
    refreshVercelProjects: () => {},
    linkedVercelProject: null,
    resolveGitlabForgeRepoOverride: () => null,
    resolvedTheme: "dark",
    safely: async () => ({}) as AppState,
    selectedChange: null,
    setActiveChangesPanelTab: () => "git",
    setActiveWorkspaceContentTab: () => "diff",
    setForgeWorkItemDetail: () => null,
    setForgeWorkItemDetailErrorMessage: () => null,
    setIsCenterDiffExpanded: () => true,
    setIsCenterFullDiffExpanded: () => false,
    setIsCreatePullRequestDialogOpen: () => true,
    setIsTaskBoardOpen: () => true,
    setTaskEditorState: () => null,
    suggestedVercelProject: null,
    unlinkCurrentWorkspaceFromVercelProject: () => {},
    vercelAccountLabel: null,
    vercelDeployments: [],
    vercelDeploymentsErrorMessage: null,
    vercelDeploymentsLoading: false,
    vercelProjects: [],
    vercelProjectsErrorMessage: null,
    vercelProjectsLoading: false,
    vercelToken: "",
    ...overrides
  };
}

test("buildChangesPanelSectionProps opens the selected change in the center diff", async () => {
  const calls: string[] = [];
  const props = buildChangesPanelSectionProps(
    createBuildDeps({
      safely: async () => {
        calls.push("select");
        return {} as AppState;
      },
      setTaskEditorState: () => {
        calls.push("clear-task-editor");
        return null;
      },
      setIsTaskBoardOpen: () => {
        calls.push("close-task-board");
        return false;
      },
      setIsCenterDiffExpanded: () => {
        calls.push("expand-diff");
        return true;
      },
      setIsCenterFullDiffExpanded: () => {
        calls.push("collapse-full-diff");
        return false;
      },
      setActiveWorkspaceContentTab: () => {
        calls.push("activate-diff-tab");
        return "diff";
      }
    }),
    { project: null, changesRoot: null, changes: [] } as unknown as AppState
  );

  await props.chrome.onSelectChange("src/app.ts");

  assert.deepEqual(calls, [
    "select",
    "clear-task-editor",
    "close-task-board",
    "collapse-full-diff",
    "expand-diff",
    "activate-diff-tab"
  ]);
});

test("buildChangesPanelSectionProps leaves the center surface unchanged when selecting a change fails", async () => {
  const calls: string[] = [];
  const props = buildChangesPanelSectionProps(
    createBuildDeps({
      safely: async () => null,
      setTaskEditorState: () => {
        calls.push("clear-task-editor");
        return null;
      },
      setIsTaskBoardOpen: () => {
        calls.push("close-task-board");
        return false;
      },
      setIsCenterDiffExpanded: () => {
        calls.push("expand-diff");
        return true;
      },
      setIsCenterFullDiffExpanded: () => {
        calls.push("collapse-full-diff");
        return false;
      },
      setActiveWorkspaceContentTab: () => {
        calls.push("activate-diff-tab");
        return "diff";
      }
    }),
    { project: null, changesRoot: null, changes: [] } as unknown as AppState
  );

  await props.chrome.onSelectChange("src/app.ts");

  assert.deepEqual(calls, []);
});

test("buildChangesPanelSectionProps opens GitLab pipeline runs in the forge viewer", () => {
  const calls: Array<{ projectId: string; kind: string; number: number; title: string }> = [];
  const props = buildChangesPanelSectionProps(
    createBuildDeps({
      openForgeViewer: (projectId, kind, number, title) => {
        calls.push({ projectId, kind, number, title });
      }
    }),
    {
      project: { id: "project-1" },
      changesRoot: null,
      changes: []
    } as unknown as AppState
  );

  props.forge.onOpenForgeWorkflowRun({
    id: "gitlab-pipeline-456",
    name: "Pipeline #12",
    status: "running",
    conclusion: null,
    branch: "main",
    event: "push",
    updatedAt: "2026-06-05T00:00:00.000Z",
    webUrl: "https://gitlab.example.com/group/project/-/pipelines/456"
  });

  assert.deepEqual(calls, [
    {
      projectId: "project-1",
      kind: "workflow_run",
      number: 456,
      title: "Pipeline #12"
    }
  ]);
});
