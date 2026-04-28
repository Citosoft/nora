import type { AiChatTabState, BrowserTabState, FileEditorTab, ForgeViewerTabState } from "@/components/app/types";
import type { WorkspaceSessionTab } from "@/components/app/types/component.types";
import type { WorkspaceSplitView, WorkspaceSummary } from "@shared/appTypes";

function getFileName(pathName: string): string {
  const normalized = pathName.replace(/\\/g, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] || pathName;
}

export function getFileWorkspaceSessionTabId(pathName: string): string {
  return `file:${pathName}`;
}

export function getDiffWorkspaceSessionTabId(pathName: string): string {
  return `diff:${pathName}`;
}

export function getWorkspaceSessionTabId(tab: WorkspaceSessionTab): string {
  if (tab.kind === "file") {
    return getFileWorkspaceSessionTabId(tab.path);
  }
  if (tab.kind === "diff") {
    return getDiffWorkspaceSessionTabId(tab.path);
  }
  return tab.id;
}

export function getActiveWorkspaceSessionTabId({
  activeViewId,
  activeWorkspaceContentTab,
  activeFileEditorPath,
  expandedDiffPath,
  activeForgeViewerTabId,
  activeBrowserTabId,
  activeAiChatTabId,
  activeAgentId,
  activeTerminalId
}: {
  activeViewId: string | null;
  activeWorkspaceContentTab: "file" | "diff" | null;
  activeFileEditorPath: string | null;
  expandedDiffPath: string | null;
  activeForgeViewerTabId: string | null;
  activeBrowserTabId: string | null;
  activeAiChatTabId: string | null;
  activeAgentId: string | null;
  activeTerminalId: string | null;
}): string | null {
  const activeContentTabId =
    activeWorkspaceContentTab === "diff"
      ? (expandedDiffPath ? getDiffWorkspaceSessionTabId(expandedDiffPath) : null)
      : activeWorkspaceContentTab === "file"
        ? (activeFileEditorPath ? getFileWorkspaceSessionTabId(activeFileEditorPath) : null)
        : null;

  return (
    activeViewId
    || activeContentTabId
    || activeForgeViewerTabId
    || activeAiChatTabId
    || activeBrowserTabId
    || activeAgentId
    || activeTerminalId
    || (activeFileEditorPath ? getFileWorkspaceSessionTabId(activeFileEditorPath) : null)
    || (expandedDiffPath ? getDiffWorkspaceSessionTabId(expandedDiffPath) : null)
    || null
  );
}

export function getAdjacentWorkspaceSessionTab(
  tabs: WorkspaceSessionTab[],
  activeTabId: string | null,
  direction: -1 | 1
): WorkspaceSessionTab | null {
  if (!tabs.length) {
    return null;
  }
  const activeIndex = activeTabId ? tabs.findIndex((tab) => getWorkspaceSessionTabId(tab) === activeTabId) : -1;
  if (activeIndex < 0) {
    return direction === 1 ? tabs[0] ?? null : tabs[tabs.length - 1] ?? null;
  }
  const nextIndex = (activeIndex + direction + tabs.length) % tabs.length;
  return tabs[nextIndex] ?? null;
}

export function getWorkspaceSessionTabs(
  workspace: WorkspaceSummary | null,
  browserTabs: BrowserTabState[],
  aiChatTabs: AiChatTabState[],
  forgeViewerTabs: ForgeViewerTabState[],
  splitViews: WorkspaceSplitView[],
  fileEditorTabs: FileEditorTab[],
  expandedDiffPath: string | null
): WorkspaceSessionTab[] {
  if (!workspace) {
    return [];
  }

  return [
    ...workspace.agents.map((item) => ({
      id: item.id,
      kind: "agent" as const,
      name: item.branch.trim() ? `${item.name} · ${item.branch}` : item.name,
      toolId: item.toolId,
      toolLabel: item.toolLabel,
      status: item.status,
      isBusy: item.isBusy,
      busyUntil: item.busyUntil
    })),
    ...workspace.terminals.map((item) => ({
      id: item.id,
      kind: "terminal" as const,
      name: item.name,
      status: item.status
    })),
    ...browserTabs
      .filter((item) => item.projectId === workspace.project.id)
      .map((item) => ({
        id: item.id,
        kind: "browser" as const,
        name: item.title,
        status: item.status,
        faviconUrl: item.faviconUrl
    })),
    ...aiChatTabs
      .filter((item) => item.projectId === workspace.project.id)
      .map((item) => ({
        id: item.id,
        kind: "ai-chat" as const,
        name: item.title,
        status: "running" as const
      })),
    ...forgeViewerTabs
      .filter((item) => item.projectId === workspace.project.id)
      .map((item) => ({
        id: item.id,
        kind: "forge" as const,
        name: item.title,
        status: "running" as const
    })),
    ...splitViews.map((view) => ({
      id: view.id,
      kind: "view" as const,
      name: view.name,
      status: "idle" as const
    })),
    ...fileEditorTabs
      .filter((tab) => tab.projectId === workspace.project.id)
      .map((tab) => ({
        id: getFileWorkspaceSessionTabId(tab.path),
        kind: "file" as const,
        path: tab.path,
        name: getFileName(tab.path),
        status: tab.content !== tab.savedContent ? "starting" as const : "idle" as const
    })),
    ...(expandedDiffPath
      ? [{
          id: getDiffWorkspaceSessionTabId(expandedDiffPath),
          kind: "diff" as const,
          path: expandedDiffPath,
          name: `Diff: ${getFileName(expandedDiffPath)}`,
          status: "idle" as const
      }]
      : [])
    
  ].sort((left, right) => left.name.localeCompare(right.name));
}
