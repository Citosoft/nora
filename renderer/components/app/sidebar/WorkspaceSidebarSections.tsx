import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { WorkspaceProjectIcon } from "@/components/app/shared/Tooling";
import type { ChatbotShortcut } from "@/components/app/types/chatbot.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ActiveRemoteMount, WorkspaceSummary } from "@shared/appTypes";
import { ChevronLeft, ChevronRight, Ellipsis, FolderGit2, Globe, HardDrive, LoaderCircle, MonitorPlay, Plus, RefreshCcw, Sparkles, StickyNote, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";

function formatRemoteMountBadgeLabel(localMount: string | null): string {
  if (!localMount) {
    return "Ssh";
  }

  const normalizedPath = localMount.replace(/[\\\/]+$/, "");
  const segments = normalizedPath.split(/[\\\/]+/).filter(Boolean);
  return segments.at(-1) || normalizedPath;
}

type ActivePortEntry = {
  projectId: string;
  projectRoot: string;
  projectName: string;
  terminal: {
    id: string;
    name: string;
    detectedLocalUrl: string | null;
    detectedLocalPort: number | null;
  };
};

export function WorkspaceSidebarCollapsedRail({
  workspaceGroups,
  projectFaviconUrlByProjectId,
  workspaceTasksCount,
  workspaceSpecsCount,
  workspaceNotesCount,
  activePortsCount,
  activeRemoteMountsCount,
  focusedWorkspaceId,
  onChooseProject,
  onRefresh,
  onResetWorkspaces,
  onCloseProject,
  onFocusWorkspace,
  hasActiveProject,
  renderWorkspaceTitle
}: {
  workspaceGroups: WorkspaceSummary[];
  projectFaviconUrlByProjectId: Record<string, string | null>;
  workspaceTasksCount: number;
  workspaceSpecsCount: number;
  workspaceNotesCount: number;
  activePortsCount: number;
  activeRemoteMountsCount: number;
  focusedWorkspaceId: string | null;
  onChooseProject: () => void;
  onRefresh: () => void;
  onResetWorkspaces: () => void;
  onCloseProject: () => void;
  onFocusWorkspace: (projectId: string) => void;
  hasActiveProject: boolean;
  renderWorkspaceTitle: (workspace: WorkspaceSummary) => string;
}) {
  return (
    <div className="flex h-full flex-col items-center gap-3 px-2 py-4">
      <Button variant="ghost" size="icon" tooltip="Add workspace" onClick={onChooseProject} aria-label="Add workspace">
        <Plus className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" tooltip="Refresh workspace" onClick={onRefresh} aria-label="Refresh workspace">
        <RefreshCcw className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" tooltip="Reset workspaces" onClick={onResetWorkspaces} aria-label="Reset workspaces">
        <Trash2 className="size-4" />
      </Button>
      {hasActiveProject ? (
        <Button variant="ghost" size="icon" tooltip="Exit workspace" onClick={onCloseProject} aria-label="Exit workspace">
          <X className="size-4" />
        </Button>
      ) : null}
      <div className="min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto pt-2">
        <div className="space-y-2 px-1">
          {workspaceGroups.length ? (
            workspaceGroups.map((workspace) => (
              <button
                key={workspace.project.id}
                onClick={() => onFocusWorkspace(workspace.project.id)}
                className={cn(
                  "grid h-10 w-full place-items-center rounded-[4px] border p-0 transition",
                  focusedWorkspaceId === workspace.project.id
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/70 bg-background/70 hover:border-primary/30 hover:bg-accent/40"
                )}
                aria-label={workspace.project.name}
                title={renderWorkspaceTitle(workspace)}
              >
                <WorkspaceProjectIcon
                  framework={workspace.project.framework}
                  projectFaviconUrl={projectFaviconUrlByProjectId[workspace.project.id] ?? null}
                  label={workspace.project.name}
                  className="size-5 rounded-none bg-transparent"
                  imageClassName="size-4"
                  fallbackIconClassName="size-4 text-muted-foreground"
                  frameworkTooltipContent={null}
                />
              </button>
            ))
          ) : (
            <div className="px-2 text-center text-xs text-muted-foreground">No workspaces</div>
          )}
        </div>
      </div>
      <div className="w-full border-t border-border/60 pt-3">
        <div className="flex flex-col items-center gap-2 px-1">
          <CollapsedMetric icon={<MonitorPlay className="size-4" />} label="Ports" count={activePortsCount} />
          <CollapsedMetric icon={<HardDrive className="size-4" />} label="Remote Mounts" count={activeRemoteMountsCount} />
          {workspaceTasksCount ? <CollapsedMetric icon={<FolderGit2 className="size-4" />} label="Workspace Tasks" count={workspaceTasksCount} /> : null}
          {workspaceSpecsCount ? <CollapsedMetric icon={<Sparkles className="size-4" />} label="Workspace Specs" count={workspaceSpecsCount} /> : null}
          {workspaceNotesCount ? <CollapsedMetric icon={<StickyNote className="size-4" />} label="Workspace Notes" count={workspaceNotesCount} /> : null}
        </div>
      </div>
    </div>
  );
}

function CollapsedMetric({ icon, label, count }: { icon: ReactNode; label: string; count: number }) {
  return (
    <Tooltip content={`${label}: ${count}`}>
      <div className="collapsed-sidebar-bottom-metric flex w-full items-center justify-center rounded-[4px] border border-border/70 bg-background/70 px-2 py-2 text-muted-foreground">
        {icon}
        <span className="sr-only">{label}</span>
        <span className="ml-1 text-[11px] tabular-nums">{count}</span>
      </div>
    </Tooltip>
  );
}

export function WorkspaceSidebarRemoteMountsSection(props: {
  activeRemoteMounts: ActiveRemoteMount[];
  visibleRemoteMounts: ActiveRemoteMount[];
  hiddenRemoteMountCount: number;
  showAllRemoteMounts: boolean;
  remoteMountActionError: string | null;
  unmountingMountPoint: string | null;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleShowAll: () => void;
  onChooseProjectAtPath: (defaultPath: string, title?: string) => Promise<void>;
  onUnmountRemoteMount: (mountPoint: string) => Promise<void>;
}) {
  const {
    activeRemoteMounts,
    visibleRemoteMounts,
    hiddenRemoteMountCount,
    showAllRemoteMounts,
    remoteMountActionError,
    unmountingMountPoint,
    isCollapsed,
    onToggleCollapsed,
    onToggleShowAll,
    onChooseProjectAtPath,
    onUnmountRemoteMount
  } = props;

  return (
    <div className="border-t border-border/60">
      <SectionHeader
        title="Remote Mounts"
        detail={`${activeRemoteMounts.length} active`}
        isCollapsed={isCollapsed}
        onToggleCollapsed={onToggleCollapsed}
      />
      {isCollapsed ? null : (
        <div className="px-2 py-2">
          {remoteMountActionError ? (
            <div className="mb-2 rounded-[4px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
              {remoteMountActionError}
            </div>
          ) : null}
          {activeRemoteMounts.length ? (
            <div className="border-y border-border/60 bg-background/20">
              {visibleRemoteMounts.map((mount) => {
                const localMount = mount.localMount;
                return (
                  <div
                    key={`${mount.remote}:${localMount || "nolocal"}`}
                    className="grid grid-cols-[auto,minmax(0,1fr),auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
                  >
                    <div
                      className="w-20 shrink-0 truncate rounded-[4px] border border-border/60 bg-background/60 px-1.5 py-0.5 text-center text-[11px] tabular-nums text-muted-foreground"
                      title={localMount || "Ssh"}
                    >
                      {formatRemoteMountBadgeLabel(localMount)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium leading-5 text-foreground">
                        {mount.user ? `${mount.user}@` : ""}{mount.host || mount.remote}
                      </div>
                    </div>
                    {localMount ? (
                      <DropdownMenu
                        trigger={(
                          <Button variant="ghost" size="icon" className="mt-[-2px] size-8 shrink-0 self-start" aria-label="Remote mount actions">
                            {unmountingMountPoint === localMount ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <Ellipsis className="size-4" />
                            )}
                          </Button>
                        )}
                        align="end"
                        widthClassName="w-56"
                      >
                        <div className="mb-1 rounded-[4px] border border-border/60 bg-background/50 px-3 py-2">
                          <div className="mb-1 text-[12px] font-medium text-muted-foreground">
                            Remote path
                          </div>
                          <div className="break-all text-xs text-popover-foreground">{mount.remotePath || "/"}</div>
                        </div>
                        <DropdownMenuItem onSelect={() => void onChooseProjectAtPath(localMount, `Choose a repository in ${mount.host || mount.remote}`)}>
                          Choose Repository Here
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onSelect={() => void onUnmountRemoteMount(localMount)}>
                          Unmount
                        </DropdownMenuItem>
                      </DropdownMenu>
                    ) : null}
                  </div>
                );
              })}
              {hiddenRemoteMountCount > 0 ? (
                <button
                  type="button"
                  onClick={onToggleShowAll}
                  className="flex w-full items-center justify-center border-t border-border/60 px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent/40 hover:text-foreground"
                >
                  {showAllRemoteMounts ? "Show fewer mounts" : `Show ${hiddenRemoteMountCount} more`}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No active SSH mounts.</div>
          )}
        </div>
      )}
    </div>
  );
}

export function WorkspaceSidebarPortsSection(props: {
  activePorts: ActivePortEntry[];
  currentProjectRoot: string | null;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onFocusTerminal: (sessionId: string) => void;
  onFocusWorkspaceTerminal: (projectId: string, sessionId: string) => Promise<unknown>;
  onOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
}) {
  const { activePorts, currentProjectRoot, isCollapsed, onToggleCollapsed, onFocusTerminal, onFocusWorkspaceTerminal, onOpenWorkspaceBrowser } = props;

  return (
    <div className="border-t border-border/60">
      <SectionHeader title="Ports" detail={`${activePorts.length} active`} isCollapsed={isCollapsed} onToggleCollapsed={onToggleCollapsed} />
      {isCollapsed ? null : (
        <div className="space-y-2 px-2 py-2">
          {activePorts.length ? (
            activePorts.map(({ projectId, projectRoot, projectName, terminal }) => (
              <div key={`${terminal.id}:${terminal.detectedLocalPort}`} className="flex items-center gap-2 rounded-[4px] border border-border/60 bg-background/40 px-2 py-2">
                <button
                  type="button"
                  onClick={() =>
                    projectRoot === currentProjectRoot
                      ? onFocusTerminal(terminal.id)
                      : void onFocusWorkspaceTerminal(projectId, terminal.id)
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <div className="rounded-[4px] border border-border/60 bg-background/50 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                    :{terminal.detectedLocalPort}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{terminal.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{projectName}</div>
                  </div>
                </button>
                <DropdownMenu
                  align="end"
                  widthClassName="w-52"
                  trigger={(
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Open ${terminal.detectedLocalUrl || "local server"}`}>
                      <MonitorPlay className="size-4" />
                    </Button>
                  )}
                >
                  <DropdownMenuItem onSelect={() => terminal.detectedLocalUrl ? onOpenWorkspaceBrowser(projectId, terminal.detectedLocalUrl) : undefined}>
                    Open in app browser
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => terminal.detectedLocalUrl ? void noraSystemClient.openExternalUrl(terminal.detectedLocalUrl) : undefined}>
                    Open externally
                  </DropdownMenuItem>
                </DropdownMenu>
              </div>
            ))
          ) : (
            <div className="px-2 text-sm text-muted-foreground">No active local ports.</div>
          )}
        </div>
      )}
    </div>
  );
}

export function WorkspaceSidebarChatbotsSection(props: {
  shortcuts: ChatbotShortcut[];
  currentProjectId: string | null;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
}) {
  const { shortcuts, currentProjectId, isCollapsed, onToggleCollapsed, onOpenWorkspaceBrowser } = props;

  return (
    <div className="border-t border-border/60">
      <SectionHeader
        title="AI Chatbots"
        detail={`${shortcuts.length} shortcuts`}
        isCollapsed={isCollapsed}
        onToggleCollapsed={onToggleCollapsed}
      />
      {isCollapsed ? null : (
        <div className="space-y-1.5 px-2 py-2">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.id}
              type="button"
              onClick={() => {
                if (!currentProjectId) {
                  return;
                }
                onOpenWorkspaceBrowser(currentProjectId, shortcut.url);
              }}
              disabled={!currentProjectId}
              title={shortcut.description}
              className={cn(
                "flex w-full items-center gap-2 rounded-[4px] border px-2.5 py-2 text-left transition",
                currentProjectId
                  ? "border-border/60 bg-background/40 hover:border-primary/30 hover:bg-accent/40"
                  : "cursor-not-allowed border-border/50 bg-background/20 opacity-60"
              )}
            >
              <div className="grid size-6 shrink-0 place-items-center rounded-[4px] border border-border/60 bg-background/60 text-primary">
                <Globe className="size-3.5" />
              </div>
              <div className="min-w-0 flex flex-1 items-center gap-2">
                <div className="truncate text-sm font-medium text-foreground">{shortcut.label}</div>
                <div className="truncate text-[11px] text-muted-foreground">{shortcut.hostLabel}</div>
              </div>
            </button>
          ))}
          {!currentProjectId ? (
            <div className="px-2 text-xs text-muted-foreground">
              Choose a workspace to open chatbot shortcuts in the internal browser.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  detail,
  isCollapsed,
  onToggleCollapsed
}: {
  title: string;
  detail: string;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-background/70 px-4 pb-2.5 pt-1.5">
      <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground">{detail}</div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onToggleCollapsed} aria-label={isCollapsed ? `Expand ${title.toLowerCase()} section` : `Collapse ${title.toLowerCase()} section`}>
          {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4 rotate-[-90deg]" />}
        </Button>
      </div>
    </div>
  );
}
