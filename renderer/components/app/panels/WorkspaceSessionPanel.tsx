import { WorkspaceSessionProvider } from "@/components/app/context/workspaceSessionContext";
import {
  useWorkspaceSessionPanelActions,
  useWorkspaceSessionPanelData
} from "@/components/app/context/workspaceSessionPanelContext";
import { createQuickTerminalDialogDefaults, createQuickTerminalPayload } from "@/components/app/logic/terminalQuickLaunch";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import { isWorkspaceSpecMarkdownPath } from "@/components/app/logic/workspaceNoraPaths";
import {
  buildWorkspaceSessionCenterSlots,
  resolveActiveWorkspaceSessionCenterSlotId
} from "@/components/app/logic/workspaceSessionCenterSlots";
import { performWorkspaceSessionTabClose } from "@/components/app/logic/performWorkspaceSessionTabClose";
import {
  getActiveWorkspaceSessionTabId,
  getWorkspaceSessionTabId,
  getWorkspaceSessionTabToFocusAfterClose,
  getWorkspaceSessionTabs
} from "@/components/app/logic/workspaceSessionTabs";
import { SessionTabPane, SessionTabStack } from "@/components/app/panels/SessionTabStack";
import { WorkspaceSessionCenterSlotContent } from "@/components/app/panels/WorkspaceSessionCenterSlotContent";
import { WorkspaceSessionTabs } from "@/components/app/panels/WorkspaceSessionTabs";
import { WorkspaceSessionToolbar } from "@/components/app/panels/WorkspaceSessionToolbar";
import { WorkspaceSplitViewPanel } from "@/components/app/panels/WorkspaceSplitViewPanel";
import type { BrowserTabState, CreateAgentDialogDefaults, CreateTerminalDialogDefaults } from "@/components/app/types";
import type { FileEditorAgentSendTarget } from "@/components/app/types/fileEditor.types";
import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";
import type {
  AgentCatalogEntry,
  AgentSession,
  TerminalSession,
  TerminalShellOption,
  WorkspaceScriptLauncher,
  WorkspaceSummary
} from "@shared/appTypes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  return tools.map((tool) =>
    [
      tool.id,
      tool.label,
      tool.detected ? "1" : "0",
      tool.enabled ? "1" : "0",
      tool.installStatus,
      tool.supportsUsageStatus ? "1" : "0",
      tool.usageDashboardUrl ?? "",
      tool.supportsAccountSwitch ? "1" : "0"
    ].join("|")
  ).join("\n");
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
    aiSettings,
    aiModelOptions,
    aiModelLoading,
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
    onSelectAiChatProviderModel,
    onOpenAiSettings,
    onFocusAiChatTab,
    onCloseAiChatTab,
    onUpdateAiChatTabMessages,
    onUpdateAiChatTabReasoningMode,
    onUpdateAiChatTabTitle,
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
  const projectScopedBrowserTabs = useMemo(
    () =>
      !project?.id ? stableBrowserTabs : stableBrowserTabs.filter((t) => t.projectId === project.id),
    [project?.id, stableBrowserTabs]
  );
  const projectScopedAiChatTabs = useMemo(
    () => (!project?.id ? aiChatTabs : aiChatTabs.filter((t) => t.projectId === project.id)),
    [aiChatTabs, project?.id]
  );

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

  const handleCloseActiveFileEditorTab = useCallback(() => {
    if (activeFileEditorTab) {
      onCloseFileEditorTab(activeFileEditorTab.path);
    }
  }, [activeFileEditorTab, onCloseFileEditorTab]);

  const forgeDetailPanelProps = useMemo(
    () => ({
      detail: forgeDetail,
      detailLoading: forgeDetailLoading,
      detailErrorMessage: forgeDetailErrorMessage,
      actionLoading: forgeActionLoading,
      commentLoading: forgeCommentLoading,
      onOpenUrl: onOpenForgeUrl,
      onOpenInViewer: null as (() => void) | null,
      onBackToList: () => {
        if (forgeViewerTab) {
          onCloseForgeViewerTab(forgeViewerTab.id);
        }
      },
      onRefreshDetail: onRefreshForgeItem,
      onAction: onForgeAction,
      onCommentSubmit: onForgeCommentSubmit,
      onSpawnIssueAgent: onSpawnIssueAgent
    }),
    [
      forgeActionLoading,
      forgeCommentLoading,
      forgeDetail,
      forgeDetailErrorMessage,
      forgeDetailLoading,
      forgeViewerTab,
      onCloseForgeViewerTab,
      onForgeAction,
      onForgeCommentSubmit,
      onOpenForgeUrl,
      onRefreshForgeItem,
      onSpawnIssueAgent
    ]
  );

  const workspaceSessionCenterSlots = useMemo(
    () =>
      buildWorkspaceSessionCenterSlots({
        activeWorkspaceContentTab,
        isDiffExpanded,
        isFullDiffExpanded,
        selectedDiffChange,
        fileEditorTabCount: fileEditorState?.tabs.length ?? 0,
        forgeViewerTabCount: forgeViewerTabs.length,
        projectScopedAiChatTabs,
        projectScopedBrowserTabs
      }),
    [
      activeWorkspaceContentTab,
      fileEditorState?.tabs.length,
      forgeViewerTabs.length,
      isDiffExpanded,
      isFullDiffExpanded,
      projectScopedAiChatTabs,
      projectScopedBrowserTabs,
      selectedDiffChange
    ]
  );

  const activeCenterSlotId = useMemo(
    () =>
      resolveActiveWorkspaceSessionCenterSlotId({
        activeWorkspaceContentTab,
        isDiffExpanded,
        isFullDiffExpanded,
        selectedDiffChange,
        activeFileEditorTab,
        forgeViewerTab,
        aiChatTab,
        browserTab
      }),
    [
      activeFileEditorTab,
      activeWorkspaceContentTab,
      aiChatTab,
      browserTab,
      forgeViewerTab,
      isDiffExpanded,
      isFullDiffExpanded,
      selectedDiffChange
    ]
  );

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
    const closedStableId = getWorkspaceSessionTabId(tab);
    const closingActiveSessionTab = closedStableId === activeTabId;
    const tabToFocusAfter =
      closingActiveSessionTab ? getWorkspaceSessionTabToFocusAfterClose(orderedSessionTabs, closedStableId) : null;
    const refocusNeighborAfterClose = (): void => {
      if (!tabToFocusAfter) {
        return;
      }
      window.setTimeout(() => {
        handleSelectTab(tabToFocusAfter);
      }, 0);
    };

    performWorkspaceSessionTabClose(tab, {
      closeAgent: (agentId) => {
        onDestroyRequest(agentId);
      },
      closeTerminal: (sessionId) => {
        setClosingTerminalTabIds((current) =>
          current.includes(sessionId) ? current : [...current, sessionId]
        );
        void onDestroyTerminal(sessionId)
          .then((result) => {
            if (result) {
              refocusNeighborAfterClose();
              return;
            }
            setClosingTerminalTabIds((current) => current.filter((id) => id !== sessionId));
          })
          .catch(() => {
            setClosingTerminalTabIds((current) => current.filter((id) => id !== sessionId));
          });
      },
      closeBrowser: (tabId) => {
        onCloseBrowserTab(tabId);
      },
      closeForge: (tabId) => {
        onCloseForgeViewerTab(tabId);
      },
      closeAiChat: (tabId) => {
        onCloseAiChatTab(tabId);
      },
      deleteSplitView: (viewId) => {
        void onDeleteViewById(viewId).then((deleted) => {
          if (deleted) {
            refocusNeighborAfterClose();
          }
        });
      },
      closeFileEditorAtPath: (pathName) => {
        onCloseFileEditorTab(pathName);
      },
      closeDiff: () => {
        onSetActiveWorkspaceContentTab(activeFileEditorTab ? "file" : null);
        if (isFullDiffExpanded) {
          onCloseFullDiff();
        } else {
          onCloseExpandedDiff();
        }
      }
    });

    if (tab.kind === "agent" || tab.kind === "terminal" || tab.kind === "view") {
      return;
    }

    refocusNeighborAfterClose();
  };

  const workspaceCenterBody: ReactNode = activeView ? (
    <SessionTabStack>
      <SessionTabPane visible>
        <WorkspaceSplitViewPanel view={activeView} />
      </SessionTabPane>
    </SessionTabStack>
  ) : (
    <SessionTabStack>
      {workspaceSessionCenterSlots.map((slot) => (
        <SessionTabPane key={slot.id} visible={activeCenterSlotId === slot.id}>
          <WorkspaceSessionCenterSlotContent
            slot={slot}
            resolvedTheme={resolvedTheme}
            snapshotChanges={snapshot?.changes ?? []}
            onCloseExpandedDiff={onCloseExpandedDiff}
            activeSpecEditorTab={activeSpecEditorTab}
            onGenerateTasksFromSpec={onGenerateTasksFromSpec}
            fileEditorAgentSendTargets={fileEditorAgentSendTargets}
            onExitFileEditorForAgentHandoff={handleExitFileEditorForAgentHandoff}
            onOpenFileEditor={openFileEditor}
            onCloseActiveFileEditorTab={handleCloseActiveFileEditorTab}
            forgeViewerTab={forgeViewerTab}
            forgeDetailProps={forgeDetailPanelProps}
            stableTools={stableTools}
            forgeOverview={forgeOverview}
            aiSettings={aiSettings}
            aiModelOptions={aiModelOptions}
            aiModelLoading={aiModelLoading}
            onSelectAiChatProviderModel={onSelectAiChatProviderModel}
            onOpenAiSettings={onOpenAiSettings}
            onUpdateAiChatTabReasoningMode={onUpdateAiChatTabReasoningMode}
            onUpdateAiChatTabTitle={onUpdateAiChatTabTitle}
            onUpdateAiChatTabMessages={onUpdateAiChatTabMessages}
            stableAgent={stableAgent}
            stableTerminal={stableTerminal}
          />
        </SessionTabPane>
      ))}
    </SessionTabStack>
  );

  return (
    <WorkspaceSessionProvider value={contextValue}>
      <div className="flex h-full min-h-0 flex-col">
        {showSessionTabs ? (
          <WorkspaceSessionTabs
            tabs={orderedSessionTabs}
            activeTabId={activeTabId}
            platform={platform}
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{workspaceCenterBody}</div>
      </div>
    </WorkspaceSessionProvider>
  );
}
