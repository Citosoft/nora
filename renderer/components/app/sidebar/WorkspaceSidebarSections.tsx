import { WorkspaceProjectIcon } from "@/components/app/shared/Tooling";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkspaceSummary } from "@shared/appTypes";
import { FolderGit2, Plus, RefreshCcw, Sparkles, StickyNote, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";

export function WorkspaceSidebarCollapsedRail({
  workspaceGroups,
  projectFaviconUrlByProjectId,
  workspaceTasksCount,
  workspaceSpecsCount,
  workspaceNotesCount,
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
      <Button variant="ghost" size="icon" tooltip="Add project" onClick={onChooseProject} aria-label="Add project">
        <Plus className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" tooltip="Refresh project" onClick={onRefresh} aria-label="Refresh project">
        <RefreshCcw className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" tooltip="Reset projects" onClick={onResetWorkspaces} aria-label="Reset projects">
        <Trash2 className="size-4" />
      </Button>
      {hasActiveProject ? (
        <Button variant="ghost" size="icon" tooltip="Exit project" onClick={onCloseProject} aria-label="Exit project">
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
            <div className="px-2 text-center text-xs text-muted-foreground">No projects</div>
          )}
        </div>
      </div>
      <div className="w-full border-t border-border/60 pt-3">
        <div className="flex flex-col items-center gap-2 px-1">
          {workspaceTasksCount ? <CollapsedMetric icon={<FolderGit2 className="size-4" />} label="Project Tasks" count={workspaceTasksCount} /> : null}
          {workspaceSpecsCount ? <CollapsedMetric icon={<Sparkles className="size-4" />} label="Project Specs" count={workspaceSpecsCount} /> : null}
          {workspaceNotesCount ? <CollapsedMetric icon={<StickyNote className="size-4" />} label="Project Notes" count={workspaceNotesCount} /> : null}
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
