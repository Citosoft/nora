import { Columns3, FolderKanban, List, Plus, Search, Sparkles, X } from "lucide-react";
import type { TaskCenterHeaderProps } from "@/components/app/types/taskCenter.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function TaskCenterHeader({
  workspaces,
  activeWorkspace,
  viewMode,
  openCount,
  completedCount,
  query,
  status,
  onQueryChange,
  onStatusChange,
  onViewModeChange,
  onSelectWorkspace,
  onCreateTask,
  onGenerate,
  onClose
}: TaskCenterHeaderProps) {
  return (
    <>
      <header className="shrink-0 px-6 pb-5 pt-7 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <FolderKanban className="size-4" aria-hidden="true" />
              Project tasks
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Task center</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Plan the work. Let your agents take it from here.</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground"
            onClick={onClose}
            aria-label="Close task center"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            {workspaces.length > 1 && activeWorkspace ? (
              <Select
                value={activeWorkspace.projectId}
                onChange={(event) => onSelectWorkspace(event.target.value)}
                className="h-8 w-48 text-xs"
                aria-label="Task workspace"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.projectId} value={workspace.projectId}>
                    {workspace.projectName}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="max-w-64 truncate text-sm font-medium" title={activeWorkspace?.projectRootPath}>
                {activeWorkspace?.projectName ?? "Your workspace"}
              </span>
            )}
            <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
              <span>{openCount} open</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500/70" aria-hidden="true" />
                {completedCount} completed
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onGenerate()} disabled={!activeWorkspace}>
              <Sparkles className="size-3.5" />
              Generate tasks
            </Button>
            <Button
              size="sm"
              onClick={() => activeWorkspace && onCreateTask(activeWorkspace.projectId)}
              disabled={!activeWorkspace}
            >
              <Plus className="size-3.5" />
              New task
            </Button>
          </div>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-y border-border/60 px-6 py-2.5 sm:px-8">
        <div className="relative min-w-40 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks by title or path"
            className="h-8 border-transparent bg-transparent pl-8 text-xs shadow-none"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "open" || value === "completed" || value === "all") onStatusChange(value);
          }}
          className="h-8 w-36 text-xs"
          aria-label="Task status"
        >
          <option value="open">Open tasks</option>
          <option value="completed">Completed</option>
          <option value="all">All tasks</option>
        </Select>
        <div
          role="group"
          aria-label="Task layout"
          className="inline-flex h-8 items-center gap-0.5 rounded-md bg-muted/40 p-0.5"
        >
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
            className={cn("h-7 px-2.5 text-xs", viewMode === "list" && "bg-muted text-foreground")}
          >
            <List className="size-3.5" />
            List
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={viewMode === "board"}
            onClick={() => onViewModeChange("board")}
            className={cn("h-7 px-2.5 text-xs", viewMode === "board" && "bg-muted text-foreground")}
          >
            <Columns3 className="size-3.5" />
            Board
          </Button>
        </div>
      </div>
    </>
  );
}
