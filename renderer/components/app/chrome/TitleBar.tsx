import { TitleBarControls } from "@/components/app/chrome/TitleBarControls";
import { TitleBarWorkspaceQuickSearch } from "@/components/app/chrome/TitleBarWorkspaceQuickSearch";
import { AppMark } from "@/components/app/shared/AppMark";
import type { TitleBarProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Bot, ChevronDown, ChevronLeft, ChevronRight, Code2, FolderGit2, Globe, History, PanelBottom, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Plus, RefreshCcw, TerminalSquare, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function TitleBar({
  windowUiState,
  useMacTitleBarChrome,
  resolvedTheme,
  canOpenProjectInIde,
  preferredIde,
  onOpenProjectInIde,
  isWorkspaceSidebarCollapsed,
  sidebarsSwapped,
  onToggleWorkspaceSidebar,
  onAddWorkspace,
  onAddRemoteWorkspace,
  onCloseWorkspace,
  onRefreshWorkspace,
  onCreateTerminal,
  onCreateAgent,
  onCreateBrowser,
  recentWorkspaces,
  onOpenRecentWorkspace,
  hasActiveWorkspace,
  isChangesSidebarCollapsed,
  onToggleChangesSidebar,
  onToggleLocalTerminalDock,
  onFocusLocalTerminalDock,
  onFocusPreviousSessionTab,
  onFocusNextSessionTab,
  splitViewSelection,
  workspaceQuickSearch
}: TitleBarProps) {
  const [showRecentWorkspaceList, setShowRecentWorkspaceList] = useState(false);
  const titleBarRef = useRef<HTMLDivElement | null>(null);
  const leftControlsRef = useRef<HTMLDivElement | null>(null);
  const rightControlsRef = useRef<HTMLDivElement | null>(null);
  const [titleBarWidth, setTitleBarWidth] = useState(0);
  const [leftControlsWidth, setLeftControlsWidth] = useState(0);
  const [rightControlsWidth, setRightControlsWidth] = useState(0);

  useEffect(() => {
    const titleBarElement = titleBarRef.current;
    const leftControlsElement = leftControlsRef.current;
    const rightControlsElement = rightControlsRef.current;
    if (!titleBarElement || !leftControlsElement || !rightControlsElement) {
      return;
    }
    const updateWidths = () => {
      setTitleBarWidth(titleBarElement.clientWidth);
      setLeftControlsWidth(leftControlsElement.clientWidth);
      setRightControlsWidth(rightControlsElement.clientWidth);
    };
    updateWidths();
    const observer = new ResizeObserver(updateWidths);
    observer.observe(titleBarElement);
    observer.observe(leftControlsElement);
    observer.observe(rightControlsElement);
    return () => {
      observer.disconnect();
    };
  }, []);

  const isCompactTitleBar = titleBarWidth > 0 && titleBarWidth <= 1360;
  const isNarrowTitleBar = titleBarWidth > 0 && titleBarWidth <= 1200;
  const centeredSearchAvailableWidth = Math.max(
    0,
    titleBarWidth - (Math.max(leftControlsWidth, rightControlsWidth) * 2 + 24)
  );
  const shouldUseAbsoluteCenteredSearch = centeredSearchAvailableWidth >= 208;
  const absoluteCenteredSearchWidth = Math.min(384, centeredSearchAvailableWidth);
  const shouldHideSplitViewSelector = isNarrowTitleBar;
  const shouldHideSplitViewCreateButton = isCompactTitleBar;
  const showCustomTitleMenus = !useMacTitleBarChrome;

  const dedupedRecentWorkspaces = useMemo(() => {
    const seenRootPaths = new Set<string>();
    return recentWorkspaces.filter((project) => {
      if (seenRootPaths.has(project.rootPath)) {
        return false;
      }
      seenRootPaths.add(project.rootPath);
      return true;
    });
  }, [recentWorkspaces]);
  const titleBarIconToneClass = resolvedTheme === "light" ? "text-slate-700" : "text-muted-foreground";
  const titleBarSelectorSurfaceClass = resolvedTheme === "light" ? "border-slate-300 bg-white" : "border-border/70 bg-background/70";

  return (
    <div
      ref={titleBarRef}
      className={[
        "workspace-shell-surface app-drag relative flex h-12 min-h-12 max-h-12 shrink-0 items-center overflow-hidden border-b border-border/60 bg-background/70 py-1.5",
        useMacTitleBarChrome ? "pl-0" : "pl-1.5"
      ].join(" ")}
    >
      <div ref={leftControlsRef} className="flex min-w-0 items-center gap-2 pr-2">
        {useMacTitleBarChrome ? (
          <TitleBarControls useMacTitleBarChrome isMaximized={windowUiState.isMaximized} iconToneClass={titleBarIconToneClass} />
        ) : null}
        <div className="flex items-center gap-2 px-1 py-0.5">
          <AppMark className="size-[18px] shrink-0 text-primary" />
        </div>
        <button
          type="button"
          className={`app-no-drag grid h-8 w-8 place-items-center rounded-[4px] ${titleBarIconToneClass} transition hover:bg-accent/60 hover:text-foreground`}
          onClick={sidebarsSwapped ? onToggleChangesSidebar : onToggleWorkspaceSidebar}
          aria-label={
            sidebarsSwapped
              ? isChangesSidebarCollapsed
                ? "Expand changes sidebar"
                : "Collapse changes sidebar"
              : isWorkspaceSidebarCollapsed
                ? "Expand projects sidebar"
                : "Collapse projects sidebar"
          }
          title={
            sidebarsSwapped
              ? isChangesSidebarCollapsed
                ? "Expand changes sidebar"
                : "Collapse changes sidebar"
              : isWorkspaceSidebarCollapsed
                ? "Expand projects sidebar"
                : "Collapse projects sidebar"
          }
        >
          {sidebarsSwapped ? (
            isChangesSidebarCollapsed ? (
              <PanelLeftOpen className="size-3.5" />
            ) : (
              <PanelLeftClose className="size-3.5" />
            )
          ) : isWorkspaceSidebarCollapsed ? (
            <PanelLeftOpen className="size-3.5" />
          ) : (
            <PanelLeftClose className="size-3.5" />
          )}
        </button>
        {showCustomTitleMenus ? (
          <>
            <DropdownMenu
              align="start"
              widthClassName="w-72 titlebar-dropdown-menu"
              trigger={(
                <button
                  type="button"
                  className={`app-no-drag flex h-8 items-center gap-1 rounded-[4px] px-2 text-xs font-medium ${titleBarIconToneClass} transition hover:bg-accent/60 hover:text-foreground`}
                  aria-label="Open File menu"
                >
                  <span>File</span>
                  <ChevronDown className="size-3.5" />
                </button>
              )}
            >
              <DropdownMenuItem onSelect={onAddWorkspace}>
                <Plus className="size-4" />
                <span>Add Project</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onAddRemoteWorkspace}>
                <Globe className="size-4" />
                <span>Add Remote Project</span>
              </DropdownMenuItem>
              {hasActiveWorkspace ? (
                <>
                  <div className="my-1 h-px bg-border/70" />
                  {canOpenProjectInIde && preferredIde ? (
                    <DropdownMenuItem onSelect={() => onOpenProjectInIde(preferredIde.id)}>
                      <Code2 className="size-4" />
                      <span>Open in {preferredIde.name}</span>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onSelect={onCreateTerminal}>
                    <TerminalSquare className="size-4" />
                    <span>New Terminal</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onCreateAgent}>
                    <Bot className="size-4" />
                    <span>New Agent</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onCreateBrowser}>
                    <Globe className="size-4" />
                    <span>New Browser</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onRefreshWorkspace}>
                    <RefreshCcw className="size-4" />
                    <span>Refresh Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onCloseWorkspace}>
                    <X className="size-4" />
                    <span>Close Project</span>
                  </DropdownMenuItem>
                </>
              ) : null}
              <div className="my-1 h-px bg-border/70" />
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[12px] text-popover-foreground transition hover:bg-accent/60"
                onClick={() => setShowRecentWorkspaceList((current) => !current)}
                aria-label="Toggle recent project list"
              >
                <History className="size-4" />
                <span>Add Recent</span>
                {showRecentWorkspaceList ? <ChevronDown className="ml-auto size-4" /> : <ChevronRight className="ml-auto size-4" />}
              </button>
              {showRecentWorkspaceList ? (
                dedupedRecentWorkspaces.length ? (
                  dedupedRecentWorkspaces.map((project) => (
                    <DropdownMenuItem
                      key={project.rootPath}
                      onSelect={() => onOpenRecentWorkspace(project.rootPath, project.name)}
                    >
                      <FolderGit2 className="size-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{project.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{project.rootPath}</div>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-[11px] text-muted-foreground">No recent projects.</div>
                )
              ) : null}
            </DropdownMenu>
            <DropdownMenu
              align="start"
              widthClassName="w-64 titlebar-dropdown-menu"
              trigger={(
                <button
                  type="button"
                  className={`app-no-drag flex h-8 items-center gap-1 rounded-[4px] px-2 text-xs font-medium ${titleBarIconToneClass} transition hover:bg-accent/60 hover:text-foreground`}
                  aria-label="Open View menu"
                >
                  <span>View</span>
                  <ChevronDown className="size-3.5" />
                </button>
              )}
            >
              <DropdownMenuItem onSelect={onToggleWorkspaceSidebar}>
                <PanelLeftClose className="size-4" />
                <span>Toggle Projects Sidebar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onToggleChangesSidebar}>
                <PanelRightClose className="size-4" />
                <span>Toggle Changes Sidebar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onToggleLocalTerminalDock}>
                <PanelBottom className="size-4" />
                <span>Toggle Local Terminal Dock</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onFocusLocalTerminalDock}>
                <TerminalSquare className="size-4" />
                <span>Focus Local Terminal Dock</span>
              </DropdownMenuItem>
              <div className="my-1 h-px bg-border/70" />
              <DropdownMenuItem onSelect={onFocusPreviousSessionTab}>
                <ChevronLeft className="size-4" />
                <span>Previous Session Tab</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onFocusNextSessionTab}>
                <ChevronRight className="size-4" />
                <span>Next Session Tab</span>
              </DropdownMenuItem>
            </DropdownMenu>
          </>
        ) : null}
      </div>
      {!shouldUseAbsoluteCenteredSearch ? (
        <div
          className={cn(
            "app-no-drag flex min-w-0 flex-1 justify-center",
            workspaceQuickSearch
              ? isNarrowTitleBar
                ? "w-[13rem] px-1"
                : isCompactTitleBar
                  ? "w-[16rem] px-1.5"
                  : "w-[min(100%,24rem)] max-w-md px-2"
              : "w-0 overflow-hidden p-0"
          )}
        >
          {workspaceQuickSearch ? (
            <TitleBarWorkspaceQuickSearch
              source={workspaceQuickSearch.source}
              openRequestId={workspaceQuickSearch.openRequestId}
              resolvedTheme={workspaceQuickSearch.resolvedTheme}
              openShortcutLabel={workspaceQuickSearch.openShortcutLabel}
              onPick={workspaceQuickSearch.onPick}
            />
          ) : null}
        </div>
      ) : null}
      {workspaceQuickSearch && shouldUseAbsoluteCenteredSearch ? (
        <div
          className="app-no-drag absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 justify-center px-2"
          style={{ width: `${absoluteCenteredSearchWidth}px` }}
        >
          <TitleBarWorkspaceQuickSearch
            source={workspaceQuickSearch.source}
            openRequestId={workspaceQuickSearch.openRequestId}
            resolvedTheme={workspaceQuickSearch.resolvedTheme}
            openShortcutLabel={workspaceQuickSearch.openShortcutLabel}
            onPick={workspaceQuickSearch.onPick}
          />
        </div>
      ) : null}
      <div ref={rightControlsRef} className="app-no-drag ml-auto flex min-w-0 items-center justify-end gap-0">
        <div className="mr-2 flex items-center">
          {splitViewSelection && !shouldHideSplitViewSelector ? (
            <div className="mr-2 flex items-center gap-2">
              <Select
                value={splitViewSelection.activeViewId ?? ""}
                onChange={(event) => splitViewSelection.onActiveViewChange(event.target.value || null)}
                className={`h-8 text-xs ${isCompactTitleBar ? "w-[136px]" : "w-[170px]"} ${titleBarSelectorSurfaceClass}`}
              >
                <option value="">Focused session</option>
                {splitViewSelection.views.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}
                  </option>
                ))}
              </Select>
              {!shouldHideSplitViewCreateButton ? (
                <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={splitViewSelection.onCreateView}>
                  <Plus className="size-3.5" />
                  New view
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={`grid h-8 w-11 shrink-0 place-items-center ${titleBarIconToneClass} transition hover:bg-accent hover:text-foreground`}
          onClick={sidebarsSwapped ? onToggleWorkspaceSidebar : onToggleChangesSidebar}
          aria-label={
            sidebarsSwapped
              ? isWorkspaceSidebarCollapsed
                ? "Expand projects sidebar"
                : "Collapse projects sidebar"
              : isChangesSidebarCollapsed
                ? "Expand changes sidebar"
                : "Collapse changes sidebar"
          }
          title={
            sidebarsSwapped
              ? isWorkspaceSidebarCollapsed
                ? "Expand projects sidebar"
                : "Collapse projects sidebar"
              : isChangesSidebarCollapsed
                ? "Expand changes sidebar"
                : "Collapse changes sidebar"
          }
        >
          {sidebarsSwapped ? (
            isWorkspaceSidebarCollapsed ? (
              <PanelRightOpen className="size-3.5" />
            ) : (
              <PanelRightClose className="size-3.5" />
            )
          ) : isChangesSidebarCollapsed ? (
            <PanelRightOpen className="size-3.5" />
          ) : (
            <PanelRightClose className="size-3.5" />
          )}
        </button>
        {!useMacTitleBarChrome ? (
          <TitleBarControls useMacTitleBarChrome={false} isMaximized={windowUiState.isMaximized} iconToneClass={titleBarIconToneClass} />
        ) : null}
      </div>
    </div>
  );
}
