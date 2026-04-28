import type {
  BrowserTabState,
  CreateAgentDialogDefaults,
  CreateTerminalDialogDefaults,
  ResolvedTheme,
  TerminalFontId,
  TerminalThemeId,
  WindowUiState
} from "@/components/app/types";
import type {
  AgentCatalogEntry,
  AppState,
  TerminalShellOption,
  WorkspaceScriptLauncher,
  WorkspaceSummary
} from "@shared/appTypes";
import { createContext, useContext, type ReactNode } from "react";

export type WorkspaceSessionContextValue = {
  project: AppState["project"];
  workspace: WorkspaceSummary | null;
  tools: AgentCatalogEntry[];
  projectScripts: WorkspaceScriptLauncher[];
  terminalShells: TerminalShellOption[];
  platform: WindowUiState["platform"];
  resolvedTheme: ResolvedTheme;
  terminalThemeId: TerminalThemeId;
  terminalFontId: TerminalFontId;
  onChooseProject: () => Promise<AppState | null>;
  onRefreshCatalog: () => Promise<AppState | null>;
  onCreateInWorkspace: (defaults: CreateAgentDialogDefaults) => void;
  onOpenCreateTerminal: (defaults: CreateTerminalDialogDefaults) => void;
  onOpenWorkspaceTerminalPresets: (projectId: string) => void;
  onOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  onOpenAiChat: (projectId: string) => void;
  onOpenWorkspaceSwitcher: () => void;
  onOpenTaskBoard: () => void;
  onOpenSpecBrowser: () => void;
  onOpenNoteBrowser: () => void;
  onFocusAgent: (agentId: string) => void;
  onFocusTerminal: (terminalId: string) => void;
  onFocusBrowserTab: (tabId: string) => void;
  onRestart: (agentId: string) => Promise<AppState | null>;
  onRestartTerminal: (sessionId: string) => Promise<AppState | null>;
  onClearTerminal: (sessionId: string) => Promise<AppState | null>;
  onDestroyRequest: (agentId: string) => void;
  onDestroyTerminal: (sessionId: string) => Promise<AppState | null>;
  browserTabs: BrowserTabState[];
};

const WorkspaceSessionContext = createContext<WorkspaceSessionContextValue | null>(null);

export function WorkspaceSessionProvider({
  value,
  children
}: {
  value: WorkspaceSessionContextValue;
  children: ReactNode;
}) {
  return (
    <WorkspaceSessionContext.Provider value={value}>
      {children}
    </WorkspaceSessionContext.Provider>
  );
}

export function useWorkspaceSessionContext(): WorkspaceSessionContextValue {
  const context = useContext(WorkspaceSessionContext);
  if (!context) {
    throw new Error("useWorkspaceSessionContext must be used within a WorkspaceSessionProvider.");
  }

  return context;
}
