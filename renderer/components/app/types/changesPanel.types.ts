import type { CreateAgentDialogDefaults, ResolvedTheme } from "@/components/app/types";
import type { OpenWorkspaceFileEditorOptions } from "@/components/app/types/workflow.types";
import type {
  AgentCatalogEntry,
  AppState,
  ChangeEntry,
  ForgeAddCommentPayload,
  ForgeBranchPullRequestStatus,
  ForgeOverview,
  ForgeWorkItemAction,
  ForgeWorkflowRunSummary,
  ForgeWorkItemDetail,
  ForgeWorkItemKind,
  ForgeWorkItemSummary,
  GenerateCommitMessageResult,
  VercelDeploymentSummary,
  VercelProjectSummary
} from "@shared/appTypes";

export type ChangesPanelWorkspaceSlice = {
  tools: AgentCatalogEntry[];
  onOpenCreateAgentDialog: (defaults?: CreateAgentDialogDefaults | null) => void;
};

export type ChangesPanelFilesSlice = {
  paths: string[];
  directoryPaths: string[];
  changeCounts: Record<string, Pick<ChangeEntry, "additions" | "deletions">>;
  loading: boolean;
  errorMessage: string | null;
  onOpenFile: (pathName: string, options?: OpenWorkspaceFileEditorOptions) => void;
  onImportImageToDirectory: (
    directoryPath: string,
    payload: { sourceUrl?: string; data?: Uint8Array; mimeType?: string; suggestedFileName?: string }
  ) => Promise<void>;
  onCreateFile: (pathName: string) => Promise<void>;
  onCreateDirectory: (pathName: string) => Promise<void>;
  onRenameFile: (fromPath: string, toPath: string) => Promise<void>;
  onDeleteFile: (pathName: string) => Promise<void>;
};

export type ChangesPanelForgeSlice = {
  overview: ForgeOverview | null;
  branchPullRequestStatus: ForgeBranchPullRequestStatus | null;
  loading: boolean;
  detail: ForgeWorkItemDetail | null;
  detailLoading: boolean;
  detailErrorMessage: string | null;
  actionLoading: boolean;
  commentLoading: boolean;
  onRefresh: () => void;
  onOpenUrl: (url: string) => void;
  onOpenForgeViewer: (kind: ForgeWorkItemKind, item: ForgeWorkItemSummary) => void;
  onOpenForgeItem: (kind: ForgeWorkItemKind, item: ForgeWorkItemSummary) => void;
  onOpenForgeWorkflowRun: (run: ForgeWorkflowRunSummary) => void;
  onBackFromForgeItem: () => void;
  onRefreshForgeItem: () => void;
  onForgeAction: (action: ForgeWorkItemAction) => void;
  onForgeCommentSubmit: (payload: ForgeAddCommentPayload) => Promise<void>;
  onSpawnIssueAgent: (toolId: string) => Promise<void>;
  onOpenCreatePullRequest: () => void;
};

export type ChangesPanelVercelSlice = {
  vercelToken: string;
  vercelAccountLabel: string | null;
  vercelProjects: VercelProjectSummary[];
  vercelDeployments: VercelDeploymentSummary[];
  linkedVercelProject: VercelProjectSummary | null;
  suggestedVercelProject: VercelProjectSummary | null;
  vercelProjectsLoading: boolean;
  vercelDeploymentsLoading: boolean;
  redeployingVercelDeploymentId: string | null;
  vercelProjectsErrorMessage: string | null;
  vercelDeploymentsErrorMessage: string | null;
  onRefreshVercelProjects: () => void;
  onRefreshVercelDeployments: () => void;
  onRedeployVercelDeployment: (deployment: VercelDeploymentSummary) => void;
  onOpenVercelSettings: () => void;
  onLinkVercelProject: (projectId: string) => void;
  onUnlinkVercelProject: () => void;
};

export type ChangesPanelChromeSlice = {
  resolvedTheme: ResolvedTheme;
  collapsed: boolean;
  activeTab: "git" | "files" | "context" | "forge" | "vercel";
  activeFilePath: string | null;
  activeBranch: string;
  selectedChange: ChangeEntry | null;
  onActiveTabChange: (tab: "git" | "files" | "context" | "forge" | "vercel") => void;
  onRefreshChanges: () => Promise<void>;
  onSelectChange: (pathName: string) => Promise<void>;
  onDiscardChange: (pathName: string) => Promise<AppState | null>;
  onOpenFullDiff: () => void;
  onCommitChanges: (message: string, paths?: string[]) => Promise<AppState | null>;
  canGenerateAiCommitMessage: boolean;
  onGenerateCommitMessage: (paths?: string[]) => Promise<GenerateCommitMessageResult | null>;
  onPullChanges: () => Promise<AppState | null>;
  onPushChanges: () => Promise<AppState | null>;
  onEditChange: (pathName: string) => void;
  onInspectCommit: (hash: string) => Promise<AppState | null>;
  onClearCommitInspection: () => Promise<AppState | null>;
};

export type ChangesPanelProps = {
  workspace: ChangesPanelWorkspaceSlice;
  files: ChangesPanelFilesSlice;
  forge: ChangesPanelForgeSlice;
  vercel: ChangesPanelVercelSlice;
  chrome: ChangesPanelChromeSlice;
};

export type ChangesPanelSectionFileHandlers = {
  openFileEditor: (pathName: string, options?: OpenWorkspaceFileEditorOptions) => void | Promise<void>;
  onCreateFile: ChangesPanelFilesSlice["onCreateFile"];
  onCreateDirectory: ChangesPanelFilesSlice["onCreateDirectory"];
  onRenameFile: ChangesPanelFilesSlice["onRenameFile"];
  onDeleteFile: ChangesPanelFilesSlice["onDeleteFile"];
};

export type ChangesPanelSectionProps = {
  forge: ChangesPanelForgeSlice;
  vercel: ChangesPanelVercelSlice;
  chrome: ChangesPanelChromeSlice;
  fileHandlers: ChangesPanelSectionFileHandlers;
  openCreateAgentDialog: (defaults?: CreateAgentDialogDefaults | null) => void;
};
