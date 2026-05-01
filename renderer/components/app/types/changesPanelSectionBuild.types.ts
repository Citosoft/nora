import type { CreateAgentDialogDefaults, ResolvedTheme, TaskEditorState } from "@/components/app/types";
import type {
  ChangesPanelChromeSlice,
  ChangesPanelForgeSlice,
  ChangesPanelSectionFileHandlers,
  ChangesPanelVercelSlice
} from "@/components/app/types/changesPanel.types";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type {
  AiSettings,
  AppState,
  ChangeEntry,
  ForgeAddCommentPayload,
  ForgeWorkItemDetail,
  ForgeWorkItemKind,
  ForgeWorkItemSummary,
  VercelDeploymentSummary
} from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

export type ChangesPanelSectionBuildDeps = {
  activeBranch: string;
  activeChangesPanelTab: ChangesPanelChromeSlice["activeTab"];
  addForgeWorkItemComment: (payload: ForgeAddCommentPayload) => Promise<void>;
  appSettingsAi: AiSettings;
  captureError: (error: unknown) => void;
  fileEditorActivePath: string | null;
  fileHandlers: ChangesPanelSectionFileHandlers;
  forgeBranchPullRequestStatus: ChangesPanelForgeSlice["branchPullRequestStatus"];
  forgeOverview: ChangesPanelForgeSlice["overview"];
  forgeWorkItemDetail: ForgeWorkItemDetail | null;
  handleSpawnForgeIssueAgent: ChangesPanelForgeSlice["onSpawnIssueAgent"];
  isChangesSidebarCollapsed: boolean;
  isLoadingForgeOverview: boolean;
  linkCurrentWorkspaceToVercelProject: ChangesPanelVercelSlice["onLinkVercelProject"];
  loadForgeWorkItemDetail: (
    kind: ForgeWorkItemKind,
    number: number,
    repoOverride?: { host: string; fullName: string } | null
  ) => Promise<void>;
  openFileEditor: (
    pathName: string,
    options: { rootPath?: string | null }
  ) => void | Promise<void>;
  openCreateAgentDialog: (defaults?: CreateAgentDialogDefaults | null) => void;
  openForgeViewer: (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    title: string,
    repoOverride?: { host: string; fullName: string } | null
  ) => void;
  openSettingsPage: (group?: SettingsGroup) => void;
  performForgeWorkItemAction: ChangesPanelForgeSlice["onForgeAction"];
  redeployVercelDeployment: (deployment: VercelDeploymentSummary) => void | Promise<void>;
  redeployingVercelDeploymentId: ChangesPanelVercelSlice["redeployingVercelDeploymentId"];
  refreshForgeOverview: ChangesPanelForgeSlice["onRefresh"];
  refreshVercelDeployments: () => void | Promise<void>;
  refreshVercelProjects: () => void | Promise<void>;
  linkedVercelProject: ChangesPanelVercelSlice["linkedVercelProject"];
  resolveGitlabForgeRepoOverride: (item: ForgeWorkItemSummary) => { host: string; fullName: string } | null;
  resolvedTheme: ResolvedTheme;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  selectedChange: ChangeEntry | null;
  setActiveChangesPanelTab: Dispatch<SetStateAction<ChangesPanelChromeSlice["activeTab"]>>;
  setActiveWorkspaceContentTab: Dispatch<SetStateAction<"file" | "diff" | null>>;
  setForgeWorkItemDetail: Dispatch<SetStateAction<ForgeWorkItemDetail | null>>;
  setForgeWorkItemDetailErrorMessage: Dispatch<SetStateAction<string | null>>;
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setIsCreatePullRequestDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsTaskBoardOpen: Dispatch<SetStateAction<boolean>>;
  setTaskEditorState: Dispatch<SetStateAction<TaskEditorState | null>>;
  suggestedVercelProject: ChangesPanelVercelSlice["suggestedVercelProject"];
  unlinkCurrentWorkspaceFromVercelProject: ChangesPanelVercelSlice["onUnlinkVercelProject"];
  vercelAccountLabel: ChangesPanelVercelSlice["vercelAccountLabel"];
  vercelDeployments: ChangesPanelVercelSlice["vercelDeployments"];
  vercelDeploymentsErrorMessage: ChangesPanelVercelSlice["vercelDeploymentsErrorMessage"];
  vercelDeploymentsLoading: ChangesPanelVercelSlice["vercelDeploymentsLoading"];
  vercelProjects: ChangesPanelVercelSlice["vercelProjects"];
  vercelProjectsErrorMessage: ChangesPanelVercelSlice["vercelProjectsErrorMessage"];
  vercelProjectsLoading: ChangesPanelVercelSlice["vercelProjectsLoading"];
  vercelToken: ChangesPanelVercelSlice["vercelToken"];
};
