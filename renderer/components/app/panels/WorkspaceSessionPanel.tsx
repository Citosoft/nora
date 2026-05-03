import { WorkspaceSessionProvider } from "@/components/app/context/workspaceSessionContext";
import {
  useWorkspaceSessionPanelActions,
  useWorkspaceSessionPanelData
} from "@/components/app/context/workspaceSessionPanelContext";
import { isAgentBusyAt } from "@/components/app/logic/agentBusy";
import { createQuickTerminalDialogDefaults, createQuickTerminalPayload } from "@/components/app/logic/terminalQuickLaunch";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import { isWorkspaceSpecMarkdownPath } from "@/components/app/logic/workspaceNoraPaths";
import { getWorkspaceSessionTabsToClose } from "@/components/app/logic/workspaceSessionTabContextActions";
import {
  getActiveWorkspaceSessionTabId,
  getWorkspaceSessionTabId,
  getWorkspaceSessionTabs
} from "@/components/app/logic/workspaceSessionTabs";
import { AiChatPanel } from "@/components/app/panels/AiChatPanel";
import { BrowserTabPanel } from "@/components/app/panels/BrowserTabPanel";
import { DiffViewer } from "@/components/app/panels/DiffViewer";
import { FileEditorPanel } from "@/components/app/panels/FileEditorPanel";
import { FocusedAgentPanel } from "@/components/app/panels/FocusedAgentPanel";
import { ForgeDetailPanel } from "@/components/app/panels/ForgePanel";
import { ForgeWorkflowRunPanel } from "@/components/app/panels/ForgeWorkflowRunPanel";
import { FullDiffViewer } from "@/components/app/panels/FullDiffViewer";
import { WorkspaceSessionToolbar } from "@/components/app/panels/WorkspaceSessionToolbar";
import { WorkspaceSplitViewPanel } from "@/components/app/panels/WorkspaceSplitViewPanel";
import { BusyIndicator } from "@/components/app/shared/BusyIndicator";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { BrowserTabState, CreateAgentDialogDefaults, CreateTerminalDialogDefaults } from "@/components/app/types";
import type { WorkspaceSessionTabsProps } from "@/components/app/types/component.types";
import type { FileEditorAgentSendTarget } from "@/components/app/types/fileEditor.types";
import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { isAgentToolAvailable } from "@shared/agentToolState";
import type {
  AgentCatalogEntry,
  AgentSession,
  TerminalSession,
  TerminalShellOption,
  WorkspaceScriptLauncher,
  WorkspaceSummary
} from "@shared/appTypes";
import { Bot, FileDiff, FileText, GitPullRequest, Globe, LayoutPanelTop, MessageSquare, Plus, TerminalSquare, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";

function assertUnreachable(value: never): never {
  throw new Error(`Unhandled workspace session tab kind: ${String(value)}`);
}

function getWorkspaceContextSignature(workspace: WorkspaceSummary | null): string {
  if (!workspace) {
    return "";
  }

  const project = workspace.project;
  const framework = project.framework;
  const location = project.location;
  const agents = workspace.agents
    .map((agent) => [
      agent.id,
      agent.sessionId,
      agent.name,
      agent.status,
      agent.mode,
      agent.toolId,
      agent.toolLabel,
      agent.workspace,
      agent.branch,
      String(agent.pid ?? "")
    ].join("|"))
    .join("\n");
  const terminals = workspace.terminals
    .map((terminal) => [
      terminal.id,
      terminal.sessionId,
      terminal.name,
      terminal.status,
      terminal.shellId,
      terminal.shellLabel,
      terminal.workspace,
      terminal.branch,
      String(terminal.pid ?? ""),
      String(terminal.detectedLocalPort ?? ""),
      terminal.detectedLocalUrl ?? ""
    ].join("|"))
    .join("\n");

  return [
    project.id,
    project.name,
    project.rootPath,
    project.baseBranch,
    framework?.label ?? "",
    framework?.version ?? "",
    framework?.logoUrl ?? "",
    location?.kind ?? "",
    location?.kind === "ssh" ? location.user : "",
    location?.kind === "ssh" ? location.host : "",
    location?.kind === "ssh" ? String(location.port ?? "") : "",
    agents,
    terminals
  ].join("\n");
}

function getTerminalShellsSignature(shells: TerminalShellOption[]): string {
  return shells.map((shell) => `${shell.id}|${shell.label}|${shell.executable}`).join("\n");
}

function getProjectScriptsSignature(scripts: WorkspaceScriptLauncher[]): string {
  return scripts.map((script) => `${script.id}|${script.packageManager}|${script.scriptName}|${script.label}|${script.command}`).join("\n");
}

function getToolsSignature(tools: AgentCatalogEntry[]): string {
  return tools.map((tool) => `${tool.id}|${tool.label}|${tool.detected ? "1" : "0"}|${tool.enabled ? "1" : "0"}|${tool.installStatus}`).join("\n");
}

function getBrowserTabsSignature(tabs: BrowserTabState[]): string {
  return tabs.map((tab) => `${tab.id}|${tab.projectId}|${tab.title}|${tab.status}|${tab.historyIndex}|${tab.history[tab.historyIndex] ?? ""}`).join("\n");
}

function getAgentRenderSignature(agent: AgentSession | null): string {
  if (!agent) {
    return "";
  }
  return [
    agent.id,
    agent.name,
    agent.status,
    agent.mode,
    agent.toolId,
    agent.toolLabel,
    agent.workspace,
    agent.branch,
    String(agent.pid ?? ""),
    agent.command
  ].join("\n");
}

function getTerminalRenderSignature(terminal: TerminalSession | null): string {
  if (!terminal) {
    return "";
  }
  return [
    terminal.id,
    terminal.name,
    terminal.status,
    terminal.shellId,
    terminal.shellLabel,
    terminal.workspace,
    terminal.branch,
    String(terminal.pid ?? ""),
    String(terminal.detectedLocalPort ?? ""),
    terminal.detectedLocalUrl ?? "",
    terminal.command
  ].join("\n");
}

function getTabOrderKey(tab: WorkspaceSessionTab): string {
  return `${tab.kind}:${getWorkspaceSessionTabId(tab)}`;
}

function WorkspaceSessionTabs({
  tabs,
  activeTabId,
  tools,
  onSelect,
  onClose,
  onCreateAgent,
  onCreateTerminalFromDefaults,
  onCreateTerminal,
  onCreateBrowser,
  onCreateAiChat
}: WorkspaceSessionTabsProps) {
  const availableTools = tools.filter((tool) => isAgentToolAvailable(tool));
  const [now, setNow] = useState(() => Date.now());
  const [contextMenuState, setContextMenuState] = useState<{ tab: WorkspaceSessionTab; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!contextMenuState) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!contextMenuRef.current?.contains(target)) {
        setContextMenuState(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenuState(null);
      }
    };
    const handleViewportChange = () => {
      setContextMenuState(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [contextMenuState]);

  const contextTab = useMemo(() => {
    if (!contextMenuState) {
      return null;
    }
    return tabs.find((tab) => tab.kind === contextMenuState.tab.kind && tab.id === contextMenuState.tab.id) ?? null;
  }, [contextMenuState, tabs]);
  const closeTabTargets = useMemo(
    () => (contextTab ? getWorkspaceSessionTabsToClose(tabs, contextTab, "close") : []),
    [contextTab, tabs]
  );
  const closeOtherTabTargets = useMemo(
    () => (contextTab ? getWorkspaceSessionTabsToClose(tabs, contextTab, "close-others") : []),
    [contextTab, tabs]
  );
  const closeRightTabTargets = useMemo(
    () => (contextTab ? getWorkspaceSessionTabsToClose(tabs, contextTab, "close-right") : []),
    [contextTab, tabs]
  );
  const closeLeftTabTargets = useMemo(
    () => (contextTab ? getWorkspaceSessionTabsToClose(tabs, contextTab, "close-left") : []),
    [contextTab, tabs]
  );
  const runCloseAction = useCallback((targets: WorkspaceSessionTab[]) => {
    if (!targets.length) {
      return;
    }
    targets.forEach((tab) => onClose(tab));
    setContextMenuState(null);
  }, [onClose]);
  const contextMenuX = contextMenuState ? Math.max(8, Math.min(contextMenuState.x, window.innerWidth - 220)) : 0;
  const contextMenuY = contextMenuState ? Math.max(8, Math.min(contextMenuState.y, window.innerHeight - 170)) : 0;

  return (
    <div className="border-b border-border/60 bg-background/70">
      <div className="flex min-h-0 items-stretch overflow-x-auto">
        <div className="flex min-h-0 items-stretch">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isBusyAgent = tab.kind === "agent" && isAgentBusyAt(tab, now);
            return (
              <Button
                key={`${tab.kind}:${tab.id}`}
                variant="ghost"
                className={cn(
                  "h-[42px] shrink-0 gap-2 rounded-none border-b-0 border-l-0 border-t-2 px-3 text-sm",
                  isActive
                    ? "border-r border-border border-t-primary bg-accent/70 text-foreground"
                    : "border-r border-border/60 border-t-transparent bg-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                )}
                onClick={() => onSelect(tab)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setContextMenuState({ tab, x: event.clientX, y: event.clientY });
                }}
              >
                {tab.kind === "agent" ? (
                  <AgentToolIcon
                    toolId={tab.toolId}
                    label={tab.toolLabel}
                    className="size-4 shrink-0 rounded-sm bg-transparent"
                    imageClassName="size-4 rounded-sm"
                  />
                ) : tab.kind === "terminal" ? (
                  <TerminalSquare className="size-4 shrink-0" />
                ) : tab.kind === "forge" ? (
                  <GitPullRequest className="size-4 shrink-0" />
                ) : tab.kind === "ai-chat" ? (
                  <MessageSquare className="size-4 shrink-0" />
                ) : tab.kind === "view" ? (
                  <LayoutPanelTop className="size-4 shrink-0" />
                ) : tab.kind === "file" ? (
                  <FileText className="size-4 shrink-0" />
                ) : tab.kind === "diff" ? (
                  <FileDiff className="size-4 shrink-0" />
                ) : tab.kind === "browser" && tab.faviconUrl ? (
                  <img
                    src={tab.faviconUrl}
                    alt=""
                    className="size-4 shrink-0 rounded-sm object-contain"
                  />
                ) : (
                  <Globe className="size-4 shrink-0" />
                )}
                <span className="max-w-48 truncate">{tab.name}</span>
                {isBusyAgent ? (
                  <BusyIndicator className="size-3.5 shrink-0" />
                ) : (
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      tab.status === "running"
                        ? "bg-emerald-500"
                        : tab.status === "starting"
                          ? "bg-amber-500"
                          : tab.status === "error"
                            ? "bg-destructive"
                            : "bg-muted-foreground/50"
                    )}
                  />
                )}
                <span
                  role="button"
                  tabIndex={0}
                  className="grid size-5 shrink-0 place-items-center rounded-[4px] text-muted-foreground transition hover:bg-accent/70 hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose(tab);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onClose(tab);
                    }
                  }}
                  aria-label={`Close ${tab.name}`}
                >
                  <X className="size-3.5" />
                </span>
              </Button>
            );
          })}
          <DropdownMenu
            align="end"
            trigger={(
              <Button
                variant="ghost"
                size="icon"
                className="h-[42px] w-[42px] shrink-0 rounded-none border-y-0 border-l-0 border-r border-border/60 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                aria-label="New session tab"
              >
                <Plus className="size-4" />
              </Button>
            )}
          >
            {availableTools.length ? availableTools.map((tool) => (
              <DropdownMenuItem key={tool.id} onSelect={() => onCreateAgent(tool.id)}>
                <AgentToolIcon
                  toolId={tool.id}
                  label={tool.label}
                  className="size-4 shrink-0 rounded-sm bg-transparent"
                  imageClassName="size-4 rounded-sm"
                />
                <span className="whitespace-nowrap text-xs">New {tool.label} agent</span>
              </DropdownMenuItem>
            )) : (
              <DropdownMenuItem onSelect={() => {}}>
                <Bot className="size-4" />
                <span className="whitespace-nowrap text-xs">No agent CLIs available</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onCreateTerminalFromDefaults}>
              <TerminalSquare className="size-4" />
              <span className="whitespace-nowrap text-xs">New Terminal (Defaults)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onCreateTerminal}>
              <TerminalSquare className="size-4" />
              <span className="whitespace-nowrap text-xs">New Terminal</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onCreateBrowser}>
              <Globe className="size-4" />
              <span className="whitespace-nowrap text-xs">New browser</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onCreateAiChat}>
              <MessageSquare className="size-4" />
              <span className="whitespace-nowrap text-xs">New AI chat</span>
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>
      {contextMenuState && contextTab ? (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] w-52 rounded-[4px] border border-border/70 bg-popover/95 p-1 shadow-xl backdrop-blur"
          style={{ left: contextMenuX, top: contextMenuY }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={closeTabTargets.length === 0}
            onClick={() => runCloseAction(closeTabTargets)}
          >
            Close Tab
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={closeOtherTabTargets.length === 0}
            onClick={() => runCloseAction(closeOtherTabTargets)}
          >
            Close Others
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={closeRightTabTargets.length === 0}
            onClick={() => runCloseAction(closeRightTabTargets)}
          >
            Close Tabs to the Right
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={closeLeftTabTargets.length === 0}
            onClick={() => runCloseAction(closeLeftTabTargets)}
          >
            Close Tabs to the Left
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceSessionPanel() {
  const {
    project,
    workspace,
    agent,
    terminal,
    browserTab,
    browserTabs,
    aiChatTab,
    aiChatTabs,
    forgeOverview,
    forgeDetail,
    forgeDetailLoading,
    forgeDetailErrorMessage,
    forgeActionLoading,
    forgeCommentLoading,
    forgeViewerTab,
    forgeViewerTabs,
    fileEditorState,
    isDiffExpanded,
    isFullDiffExpanded,
    selectedDiffChange,
    splitViews,
    tools,
    projectScripts,
    terminalShells,
    terminalQuickLaunchDefaults,
    platform,
    resolvedTheme,
    terminalThemeId,
    terminalFontId,
    showSessionTabs,
    activeView,
    activeWorkspaceContentTab,
    addFocusedLabel
  } = useWorkspaceSessionPanelData();
  const {
    onChooseProject,
    onRefreshCatalog,
    onCreateInWorkspace,
    onLaunchTerminalFromDefaults,
    onOpenCreateTerminal,
    onOpenWorkspaceTerminalPresets,
    onOpenWorkspaceBrowser,
    onOpenWorkspaceSwitcher,
    onOpenTaskBoard,
    onOpenSpecBrowser,
    onOpenNoteBrowser,
    onGenerateTasksFromSpec,
    onFocusView,
    onFocusBrowserTab,
    onCloseBrowserTab,
    onOpenAiChat,
    onOpenFileEditor,
    onFocusAiChatTab,
    onCloseAiChatTab,
    onFocusForgeViewerTab,
    onCloseForgeViewerTab,
    onOpenForgeUrl,
    onRefreshForgeItem,
    onForgeAction,
    onForgeCommentSubmit,
    onSpawnIssueAgent,
    onFocusFileEditorTab,
    onCloseFileEditorTab,
    onSetActiveWorkspaceContentTab,
    onCloseExpandedDiff,
    onCloseFullDiff,
    onRestart,
    onRestartTerminal,
    onClearTerminal,
    onDestroyRequest,
    onDestroyTerminal,
    onDeleteViewById,
    onExitSplitView,
    onFocusAgent,
    onFocusTerminal
  } = useWorkspaceSessionPanelActions();
  const stableWorkspace = useMemo(() => workspace, [getWorkspaceContextSignature(workspace)]);
  const stableTerminalShells = useMemo(() => terminalShells, [getTerminalShellsSignature(terminalShells)]);
  const stableProjectScripts = useMemo(() => projectScripts, [getProjectScriptsSignature(projectScripts)]);
  const stableTools = useMemo(() => tools, [getToolsSignature(tools)]);
  const stableBrowserTabs = useMemo(() => browserTabs, [getBrowserTabsSignature(browserTabs)]);

  const chooseProjectRef = useRef(onChooseProject);
  const refreshCatalogRef = useRef(onRefreshCatalog);
  const createInWorkspaceRef = useRef(onCreateInWorkspace);
  const openCreateTerminalRef = useRef(onOpenCreateTerminal);
  const openWorkspaceTerminalPresetsRef = useRef(onOpenWorkspaceTerminalPresets);
  const openWorkspaceBrowserRef = useRef(onOpenWorkspaceBrowser);
  const openAiChatRef = useRef(onOpenAiChat);
  const openWorkspaceSwitcherRef = useRef(onOpenWorkspaceSwitcher);
  const openTaskBoardRef = useRef(onOpenTaskBoard);
  const openSpecBrowserRef = useRef(onOpenSpecBrowser);
  const openNoteBrowserRef = useRef(onOpenNoteBrowser);
  const focusAgentRef = useRef(onFocusAgent);
  const focusTerminalRef = useRef(onFocusTerminal);
  const focusBrowserTabRef = useRef(onFocusBrowserTab);
  const restartRef = useRef(onRestart);
  const restartTerminalRef = useRef(onRestartTerminal);
  const clearTerminalRef = useRef(onClearTerminal);
  const destroyRequestRef = useRef(onDestroyRequest);
  const destroyTerminalRef = useRef(onDestroyTerminal);

  useEffect(() => {
    chooseProjectRef.current = onChooseProject;
    refreshCatalogRef.current = onRefreshCatalog;
    createInWorkspaceRef.current = onCreateInWorkspace;
    openCreateTerminalRef.current = onOpenCreateTerminal;
    openWorkspaceTerminalPresetsRef.current = onOpenWorkspaceTerminalPresets;
    openWorkspaceBrowserRef.current = onOpenWorkspaceBrowser;
    openAiChatRef.current = onOpenAiChat;
    openWorkspaceSwitcherRef.current = onOpenWorkspaceSwitcher;
    openTaskBoardRef.current = onOpenTaskBoard;
    openSpecBrowserRef.current = onOpenSpecBrowser;
    openNoteBrowserRef.current = onOpenNoteBrowser;
    focusAgentRef.current = onFocusAgent;
    focusTerminalRef.current = onFocusTerminal;
    focusBrowserTabRef.current = onFocusBrowserTab;
    restartRef.current = onRestart;
    restartTerminalRef.current = onRestartTerminal;
    clearTerminalRef.current = onClearTerminal;
    destroyRequestRef.current = onDestroyRequest;
    destroyTerminalRef.current = onDestroyTerminal;
  }, [
    onChooseProject,
    onRefreshCatalog,
    onCreateInWorkspace,
    onOpenCreateTerminal,
    onOpenWorkspaceTerminalPresets,
    onOpenWorkspaceBrowser,
    onOpenAiChat,
    onOpenWorkspaceSwitcher,
    onOpenTaskBoard,
    onOpenSpecBrowser,
    onOpenNoteBrowser,
    onFocusAgent,
    onFocusTerminal,
    onFocusBrowserTab,
    onRestart,
    onRestartTerminal,
    onClearTerminal,
    onDestroyRequest,
    onDestroyTerminal
  ]);

  const chooseProject = useCallback(() => chooseProjectRef.current(), []);
  const refreshCatalog = useCallback(() => refreshCatalogRef.current(), []);
  const createInWorkspace = useCallback((defaults: CreateAgentDialogDefaults) => createInWorkspaceRef.current(defaults), []);
  const openCreateTerminal = useCallback((defaults: CreateTerminalDialogDefaults) => openCreateTerminalRef.current(defaults), []);
  const openWorkspaceTerminalPresets = useCallback((projectId: string) => openWorkspaceTerminalPresetsRef.current(projectId), []);
  const openWorkspaceBrowser = useCallback((projectId: string, url?: string) => openWorkspaceBrowserRef.current(projectId, url), []);
  const openAiChat = useCallback((projectId: string) => openAiChatRef.current(projectId), []);
  const openFileEditor = useCallback((pathName: string, options?: { selectChange?: boolean; rootPath?: string | null }) => onOpenFileEditor(pathName, options), [onOpenFileEditor]);
  const openWorkspaceSwitcher = useCallback(() => openWorkspaceSwitcherRef.current(), []);
  const openTaskBoard = useCallback(() => openTaskBoardRef.current(), []);
  const openSpecBrowser = useCallback(() => openSpecBrowserRef.current(), []);
  const openNoteBrowser = useCallback(() => openNoteBrowserRef.current(), []);
  const focusAgent = useCallback((agentId: string) => focusAgentRef.current(agentId), []);
  const focusTerminal = useCallback((terminalId: string) => focusTerminalRef.current(terminalId), []);
  const focusBrowserTab = useCallback((tabId: string) => focusBrowserTabRef.current(tabId), []);
  const restart = useCallback((agentId: string) => restartRef.current(agentId), []);
  const restartTerminal = useCallback((sessionId: string) => restartTerminalRef.current(sessionId), []);
  const clearTerminal = useCallback((sessionId: string) => clearTerminalRef.current(sessionId), []);
  const destroyRequest = useCallback((agentId: string) => destroyRequestRef.current(agentId), []);
  const destroyTerminal = useCallback((sessionId: string) => destroyTerminalRef.current(sessionId), []);

  const activeFileEditorTab = fileEditorState?.tabs.find((tab) => tab.path === fileEditorState.activePath) ?? fileEditorState?.tabs[0] ?? null;
  const snapshot = useCanonicalAppSnapshot();
  const activeSpecEditorTab =
    activeFileEditorTab && isWorkspaceSpecMarkdownPath(activeFileEditorTab.path) ? activeFileEditorTab : null;
  const stableAgent = useMemo(() => agent, [getAgentRenderSignature(agent)]);
  const stableTerminal = useMemo(() => terminal, [getTerminalRenderSignature(terminal)]);
  const expandedDiffPath = isDiffExpanded
    ? (isFullDiffExpanded ? "__all_changes__" : (selectedDiffChange ? selectedDiffChange.path : null))
    : null;
  const sessionTabs = getWorkspaceSessionTabs(
    stableWorkspace,
    stableBrowserTabs,
    aiChatTabs,
    forgeViewerTabs,
    splitViews,
    fileEditorState?.tabs ?? [],
    expandedDiffPath,
    isFullDiffExpanded ? (snapshot?.changes.length ?? 0) : undefined
  );
  const [closingTerminalTabIds, setClosingTerminalTabIds] = useState<string[]>([]);
  const sessionTabOrderRef = useRef<string[]>([]);
  useEffect(() => {
    sessionTabOrderRef.current = [];
    setClosingTerminalTabIds([]);
  }, [workspace?.project.id]);
  useEffect(() => {
    const activeTerminalIds = new Set(
      sessionTabs.filter((tab) => tab.kind === "terminal").map((tab) => tab.id)
    );
    setClosingTerminalTabIds((current) => {
      const next = current.filter((id) => activeTerminalIds.has(id));
      if (next.length !== current.length) {
        return next;
      }
      for (let index = 0; index < next.length; index += 1) {
        if (next[index] !== current[index]) {
          return next;
        }
      }
      return current;
    });
  }, [sessionTabs]);
  const visibleSessionTabs = useMemo(
    () => sessionTabs.filter((tab) => tab.kind !== "terminal" || !closingTerminalTabIds.includes(tab.id)),
    [closingTerminalTabIds, sessionTabs]
  );
  const orderedSessionTabs = useMemo(() => {
    if (!visibleSessionTabs.length) {
      sessionTabOrderRef.current = [];
      return visibleSessionTabs;
    }
    const keyedTabs = visibleSessionTabs.map((tab) => ({
      key: getTabOrderKey(tab),
      tab
    }));
    const tabByKey = new Map(keyedTabs.map((entry) => [entry.key, entry.tab]));
    const existingOrder = sessionTabOrderRef.current.filter((key) => tabByKey.has(key));
    const nextKeys = keyedTabs.map((entry) => entry.key);
    const newKeys = nextKeys.filter((key) => !existingOrder.includes(key));
    const nextOrder = [...existingOrder, ...newKeys];
    sessionTabOrderRef.current = nextOrder;
    return nextOrder
      .map((key) => tabByKey.get(key))
      .filter((tab): tab is WorkspaceSessionTab => Boolean(tab));
  }, [visibleSessionTabs]);
  const preferredTerminalShellId = resolvePreferredTerminalShellId(stableTerminalShells);
  const activeTabId = getActiveWorkspaceSessionTabId({
    activeViewId: activeView?.id ?? null,
    activeWorkspaceContentTab,
    activeFileEditorPath: activeFileEditorTab?.path ?? null,
    expandedDiffPath,
    activeForgeViewerTabId: forgeViewerTab?.id ?? null,
    activeAiChatTabId: aiChatTab?.id ?? null,
    activeBrowserTabId: browserTab?.id ?? null,
    activeAgentId: agent?.id ?? null,
    activeTerminalId: terminal?.id ?? null
  });
  const fileEditorAgentSendTargets = useMemo((): FileEditorAgentSendTarget[] => {
    if (!stableWorkspace) {
      return [];
    }
    return stableWorkspace.agents
      .filter((a) => a.status === "running")
      .map((a) => ({
        id: a.id,
        label: a.name.trim() || a.toolLabel
      }));
  }, [stableWorkspace]);
  const handleExitFileEditorForAgentHandoff = useCallback(() => {
    onSetActiveWorkspaceContentTab(null);
    onExitSplitView();
  }, [onSetActiveWorkspaceContentTab, onExitSplitView]);
  const renderActiveWorkspaceContent = () => {
    if (activeView) {
      return (
        <>
          <div className="border-b border-border/60 bg-background/40 px-4 py-2 text-xs text-muted-foreground">
            Focus an agent or terminal from the left sidebar, then use <span className="font-medium text-foreground">{addFocusedLabel}</span> to add it to this view.
          </div>
          <WorkspaceSplitViewPanel view={activeView} />
        </>
      );
    }
    if (activeWorkspaceContentTab === "diff" && isDiffExpanded && isFullDiffExpanded) {
      return (
        <FullDiffViewer
          changes={snapshot?.changes ?? []}
          resolvedTheme={resolvedTheme}
        />
      );
    }
    if (activeWorkspaceContentTab === "diff" && isDiffExpanded && selectedDiffChange) {
      return (
        <DiffViewer
          change={selectedDiffChange}
          expanded
          resolvedTheme={resolvedTheme}
          onClose={onCloseExpandedDiff}
        />
      );
    }
    if (activeWorkspaceContentTab === "file" && fileEditorState && activeFileEditorTab) {
      return (
        <FileEditorPanel
          title="File editor"
          showTabStrip={false}
          onGenerateTasks={
            activeSpecEditorTab
              ? () => {
                  onGenerateTasksFromSpec(activeSpecEditorTab.projectId, activeSpecEditorTab.path);
                }
              : null
          }
          agentSendTargets={fileEditorAgentSendTargets}
          onExitFileEditorForAgentHandoff={handleExitFileEditorForAgentHandoff}
          onOpenFileEditor={openFileEditor}
          onClose={() => onCloseFileEditorTab(activeFileEditorTab.path)}
        />
      );
    }
    if (forgeViewerTab) {
      if (forgeViewerTab.kind === "workflow_run") {
        return (
          <ForgeWorkflowRunPanel
            projectId={forgeViewerTab.projectId}
            runId={forgeViewerTab.number}
            onOpenUrl={onOpenForgeUrl}
          />
        );
      }
      return (
        <ForgeDetailPanel
          detail={forgeDetail}
          detailLoading={forgeDetailLoading}
          detailErrorMessage={forgeDetailErrorMessage}
          actionLoading={forgeActionLoading}
          commentLoading={forgeCommentLoading}
          resolvedTheme={resolvedTheme}
          tools={stableTools}
          onOpenUrl={onOpenForgeUrl}
          onBackToList={() => onCloseForgeViewerTab(forgeViewerTab.id)}
          onRefreshDetail={onRefreshForgeItem}
          onAction={onForgeAction}
          onCommentSubmit={onForgeCommentSubmit}
          onSpawnIssueAgent={onSpawnIssueAgent}
          repoFullName={forgeOverview?.repo?.fullName ?? null}
          repoProvider={forgeOverview?.repo?.provider ?? "github"}
        />
      );
    }
    if (aiChatTab) {
      return <AiChatPanel />;
    }
    if (browserTab) {
      return <BrowserTabPanel />;
    }
    return (
      <FocusedAgentPanel
        agent={stableAgent}
        terminal={stableTerminal}
      />
    );
  };
  const contextValue = {
    project,
    workspace: stableWorkspace,
    tools: stableTools,
    projectScripts: stableProjectScripts,
    terminalShells: stableTerminalShells,
    platform,
    resolvedTheme,
    terminalThemeId,
    terminalFontId,
    onChooseProject: chooseProject,
    onRefreshCatalog: refreshCatalog,
    onCreateInWorkspace: createInWorkspace,
    onOpenCreateTerminal: openCreateTerminal,
    onOpenWorkspaceTerminalPresets: openWorkspaceTerminalPresets,
    onOpenWorkspaceBrowser: openWorkspaceBrowser,
    onOpenAiChat: openAiChat,
    onOpenWorkspaceSwitcher: openWorkspaceSwitcher,
    onOpenTaskBoard: openTaskBoard,
    onOpenSpecBrowser: openSpecBrowser,
    onOpenNoteBrowser: openNoteBrowser,
    onFocusAgent: focusAgent,
    onFocusTerminal: focusTerminal,
    onFocusBrowserTab: focusBrowserTab,
    onRestart: restart,
    onRestartTerminal: restartTerminal,
    onClearTerminal: clearTerminal,
    onDestroyRequest: destroyRequest,
    onDestroyTerminal: destroyTerminal,
    browserTabs: stableBrowserTabs
  };
  const handleSelectTab = (tab: WorkspaceSessionTab): void => {
    switch (tab.kind) {
      case "agent":
        onSetActiveWorkspaceContentTab(null);
        onExitSplitView();
        onFocusAgent(tab.id);
        return;
      case "terminal":
        onSetActiveWorkspaceContentTab(null);
        onExitSplitView();
        onFocusTerminal(tab.id);
        return;
      case "browser":
        onSetActiveWorkspaceContentTab(null);
        onExitSplitView();
        onFocusBrowserTab(tab.id);
        return;
      case "forge":
        onSetActiveWorkspaceContentTab(null);
        onExitSplitView();
        onFocusForgeViewerTab(tab.id);
        return;
      case "ai-chat":
        onSetActiveWorkspaceContentTab(null);
        onExitSplitView();
        onFocusAiChatTab(tab.id);
        return;
      case "view":
        onSetActiveWorkspaceContentTab(null);
        onFocusView(tab.id);
        return;
      case "file":
        onExitSplitView();
        onSetActiveWorkspaceContentTab("file");
        onFocusFileEditorTab(tab.path);
        return;
      case "diff":
        onExitSplitView();
        onSetActiveWorkspaceContentTab("diff");
        return;
    }
    return assertUnreachable(tab);
  };
  const handleCloseTab = (tab: WorkspaceSessionTab): void => {
    switch (tab.kind) {
      case "agent":
        onDestroyRequest(tab.id);
        return;
      case "terminal":
        setClosingTerminalTabIds((current) =>
          current.includes(tab.id) ? current : [...current, tab.id]
        );
        void onDestroyTerminal(tab.id).then((result) => {
          if (result) {
            return;
          }
          setClosingTerminalTabIds((current) => current.filter((id) => id !== tab.id));
        }).catch(() => {
          setClosingTerminalTabIds((current) => current.filter((id) => id !== tab.id));
        });
        return;
      case "browser":
        onCloseBrowserTab(tab.id);
        return;
      case "forge":
        onCloseForgeViewerTab(tab.id);
        return;
      case "ai-chat":
        onCloseAiChatTab(tab.id);
        return;
      case "view":
        void onDeleteViewById(tab.id);
        return;
      case "file":
        onCloseFileEditorTab(tab.path);
        return;
      case "diff":
        onSetActiveWorkspaceContentTab(activeFileEditorTab ? "file" : null);
        if (isFullDiffExpanded) {
          onCloseFullDiff();
        } else {
          onCloseExpandedDiff();
        }
        return;
    }
    return assertUnreachable(tab);
  };

  return (
    <WorkspaceSessionProvider value={contextValue}>
      <div className="flex h-full min-h-0 flex-col">
        {showSessionTabs ? (
          <WorkspaceSessionTabs
            tabs={orderedSessionTabs}
            activeTabId={activeTabId}
            tools={tools}
            onSelect={handleSelectTab}
            onClose={handleCloseTab}
            onCreateAgent={(toolId) => {
              if (!workspace) {
                return;
              }
              onExitSplitView();
              onCreateInWorkspace({ toolId });
            }}
            onCreateTerminalFromDefaults={() => {
              if (!workspace || !preferredTerminalShellId) {
                return;
              }
              onExitSplitView();
              onLaunchTerminalFromDefaults(createQuickTerminalPayload(preferredTerminalShellId, terminalQuickLaunchDefaults));
            }}
            onCreateTerminal={() => {
              if (!workspace) {
                return;
              }
              onExitSplitView();
              onOpenCreateTerminal(createQuickTerminalDialogDefaults(preferredTerminalShellId, terminalQuickLaunchDefaults));
            }}
            onCreateBrowser={() => {
              if (!workspace) {
                return;
              }
              onExitSplitView();
              onOpenWorkspaceBrowser(workspace.project.id);
            }}
            onCreateAiChat={() => {
              if (!workspace) {
                return;
              }
              onExitSplitView();
              onOpenAiChat(workspace.project.id);
            }}
          />
        ) : null}
        {activeView ? (
          <div className="border-b border-border/60 bg-background/60 px-3 py-2">
            <WorkspaceSessionToolbar />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-hidden">
          {renderActiveWorkspaceContent()}
        </div>
      </div>
    </WorkspaceSessionProvider>
  );
}
