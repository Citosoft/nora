import { TitleBarControls } from "@/components/app/chrome/TitleBarControls";
import { TitleBarRoleSwitcher } from "@/components/app/chrome/TitleBarRoleSwitcher";
import { TitleBarWorkspaceQuickSearch } from "@/components/app/chrome/TitleBarWorkspaceQuickSearch";
import { useTitleBarContentInset } from "@/components/app/hooks/useTitleBarContentInset";
import { useTitleBarLayout } from "@/components/app/hooks/useTitleBarLayout";
import { AppMark } from "@/components/app/shared/AppMark";
import type { TitleBarProps } from "@/components/app/types/component.types";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub } from "@/components/ui/dropdown-menu";
import { menuItemDescriptionClass } from "@/components/ui/menu-styles";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, Code2, FolderGit2, Globe, History, MessageSquarePlus, PanelBottom, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Plus, RefreshCcw, TerminalSquare, X } from "lucide-react";
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
  workspaceQuickSearch
}: TitleBarProps) {
  const titleBarRef = useRef<HTMLDivElement | null>(null);
  const [titleBarWidth, setTitleBarWidth] = useState(0);
  const titleBarLayout = useTitleBarLayout();
  const [middleRegion, setMiddleRegion] = useState<HTMLDivElement | null>(null);
  const contentInset = useTitleBarContentInset(titleBarLayout?.contentColumn ?? null, middleRegion);

  useEffect(() => {
    const titleBarElement = titleBarRef.current;
    if (!titleBarElement) {
      return;
    }
    const updateWidth = () => {
      setTitleBarWidth(titleBarElement.clientWidth);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(titleBarElement);
    return () => {
      observer.disconnect();
    };
  }, []);

  const isNarrowTitleBar = titleBarWidth > 0 && titleBarWidth <= 1200;
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

  return (
    <div
      ref={titleBarRef}
      className={[
        "workspace-shell-surface workspace-chrome-surface app-drag relative flex h-12 min-h-12 max-h-12 shrink-0 items-center overflow-hidden border-b border-border/60 bg-background py-1.5",
        useMacTitleBarChrome ? "pl-0" : "pl-1.5"
      ].join(" ")}
    >
      <div className="flex shrink-0 items-center gap-2 pr-2">
        {useMacTitleBarChrome ? (
          <TitleBarControls useMacTitleBarChrome isMaximized={windowUiState.isMaximized} iconToneClass={titleBarIconToneClass} />
        ) : null}
        <div className="flex items-center gap-2 px-1 py-0.5">
          <AppMark className="size-[18px] shrink-0 text-primary" />
        </div>
        <button
          type="button"
          className={`app-no-drag grid h-8 w-8 place-items-center rounded-md ${titleBarIconToneClass} transition hover:bg-accent/60 hover:text-foreground`}
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
              widthClassName="w-72"
              trigger={(
                <button
                  type="button"
                  className={`app-no-drag flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium ${titleBarIconToneClass} transition hover:bg-accent/60 hover:text-foreground`}
                  aria-label="Open File menu"
                >
                  <span>File</span>
                  <ChevronDown className="size-3.5" />
                </button>
              )}
            >
              <DropdownMenuItem onSelect={onAddWorkspace}>
                <Plus className="size-4" />
                <span>Add workspace</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onAddRemoteWorkspace}>
                <Globe className="size-4" />
                <span>Add remote workspace</span>
              </DropdownMenuItem>
              {hasActiveWorkspace ? (
                <>
                  <DropdownMenuSeparator />
                  {canOpenProjectInIde && preferredIde ? (
                    <DropdownMenuItem onSelect={() => onOpenProjectInIde(preferredIde.id)}>
                      <Code2 className="size-4" />
                      <span>Open in {preferredIde.name}</span>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onSelect={onCreateTerminal}>
                    <TerminalSquare className="size-4" />
                    <span>New terminal</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onCreateAgent}>
                    <MessageSquarePlus className="size-4" />
                    <span>New thread</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onCreateBrowser}>
                    <Globe className="size-4" />
                    <span>New browser</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onRefreshWorkspace}>
                    <RefreshCcw className="size-4" />
                    <span>Refresh workspace</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onCloseWorkspace}>
                    <X className="size-4" />
                    <span>Close workspace</span>
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuSub label="Open recent" icon={<History className="size-4" />}>
                {dedupedRecentWorkspaces.length ? (
                  dedupedRecentWorkspaces.map((project) => (
                    <DropdownMenuItem
                      key={project.rootPath}
                      onSelect={() => onOpenRecentWorkspace(project.rootPath, project.name)}
                    >
                      <FolderGit2 className="size-4" />
                      <span className="min-w-0">
                        <span className="block truncate">{project.name}</span>
                        <span className={cn("block", menuItemDescriptionClass)}>{project.rootPath}</span>
                      </span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuLabel>No recent workspaces</DropdownMenuLabel>
                )}
              </DropdownMenuSub>
            </DropdownMenu>
            <DropdownMenu
              align="start"
              widthClassName="w-64"
              trigger={(
                <button
                  type="button"
                  className={`app-no-drag flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium ${titleBarIconToneClass} transition hover:bg-accent/60 hover:text-foreground`}
                  aria-label="Open View menu"
                >
                  <span>View</span>
                  <ChevronDown className="size-3.5" />
                </button>
              )}
            >
              <DropdownMenuItem onSelect={onToggleWorkspaceSidebar}>
                <PanelLeftClose className="size-4" />
                <span>Toggle workspace sidebar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onToggleChangesSidebar}>
                <PanelRightClose className="size-4" />
                <span>Toggle changes sidebar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onToggleLocalTerminalDock}>
                <PanelBottom className="size-4" />
                <span>Toggle terminal dock</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onFocusLocalTerminalDock}>
                <TerminalSquare className="size-4" />
                <span>Focus terminal dock</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onFocusPreviousSessionTab}>
                <ChevronLeft className="size-4" />
                <span>Previous tab</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onFocusNextSessionTab}>
                <ChevronRight className="size-4" />
                <span>Next tab</span>
              </DropdownMenuItem>
            </DropdownMenu>
          </>
        ) : null}
      </div>
      <div ref={setMiddleRegion} className="relative flex h-full min-w-0 flex-1 items-center">
        {/* Continues the content column's left border up into the chrome, stopping short of the top and bottom edges. */}
        {contentInset > 0 ? (
          <div aria-hidden className="pointer-events-none absolute -bottom-1.5 -top-1.5 py-2.5" style={{ left: contentInset }}>
            <div className="h-full w-px bg-border/70" />
          </div>
        ) : null}
        {/* The session panel portals the workspace tab row here; empty space around the tabs still drags the window. */}
        <div ref={titleBarLayout?.setTabSlot} className="flex h-full min-w-0 flex-1 items-center" style={{ marginLeft: contentInset }} />
      </div>
      <div className="app-no-drag ml-auto flex shrink-0 items-center justify-end gap-0">
        {workspaceQuickSearch ? (
          <TitleBarWorkspaceQuickSearch {...workspaceQuickSearch} iconToneClass={titleBarIconToneClass} />
        ) : null}
        <TitleBarRoleSwitcher compact={isNarrowTitleBar} iconToneClass={titleBarIconToneClass} />
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
