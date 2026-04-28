import type {
  CreateAgentDialogDefaults,
  CreateTerminalDialogDefaults,
  BrowserTabState,
  WindowUiState
} from "@/components/app/types";
import type { AgentCatalogEntry, AppState, TerminalShellOption, WorkspaceScriptLauncher, WorkspaceSummary } from "@shared/appTypes";

export type FocusedAgentDetectedPortRow = {
  projectId: string;
  terminalId: string;
  terminalName: string;
  url: string;
  port: number;
};

export type FocusedAgentWorkspaceHomeProps = {
  workspace: WorkspaceSummary;
  workspaceProjectFaviconUrl: string | null;
  workspaceSwitcherShortcutLabel: string | null;
  activeSessionCount: number;
  workspaceBrowserTabs: BrowserTabState[];
  activePorts: FocusedAgentDetectedPortRow[];
  detectedTools: AgentCatalogEntry[];
  scripts: WorkspaceScriptLauncher[];
  terminalShells: TerminalShellOption[];
  launchShellId: string | null;
  defaultShellId: string | null;
  isDirectSshWorkspace: boolean;
  directSshHost: string | null;
  tools: AgentCatalogEntry[];
  isRefreshingRemoteTools: boolean;
  showRemoteToolDiagnostics: boolean;
  onToggleRemoteToolDiagnostics: () => void;
  onRedetectRemoteClis: () => void;
  onShellSelectChange: (shellId: string | null) => void;
  onMakeDefaultShell: () => void;
  onClearDefaultShell: () => void;
  launchBlankTerminal: () => void;
  onOpenWorkspaceSwitcher: () => void;
  onOpenTaskBoard: () => void;
  onOpenSpecBrowser: () => void;
  onOpenNoteBrowser: () => void;
  onFocusAgent: (agentId: string) => void;
  onFocusTerminal: (terminalId: string) => void;
  onFocusBrowserTab: (tabId: string) => void;
  onOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  onCreateInWorkspace: (defaults: CreateAgentDialogDefaults) => void;
  onOpenAiChat: (projectId: string) => void;
  onOpenWorkspaceTerminalPresets: (projectId: string) => void;
  onOpenCreateTerminal: (defaults: CreateTerminalDialogDefaults) => void;
};

export type FocusedAgentNoSessionViewProps = {
  project: AppState["project"];
  workspace: WorkspaceSummary | null;
  platform: WindowUiState["platform"];
  addWorkspaceShortcutParts: string[];
  onChooseProject: () => void;
  workspaceHome: FocusedAgentWorkspaceHomeProps | null;
};
