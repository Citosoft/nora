import { useEffect, useState } from "react";
import { FolderKanban, LoaderCircle, Plus } from "lucide-react";
import { GenerateTasksDialog } from "@/components/app/dialogs/GenerateTasksDialog";
import { resolveTaskCompletionTogglePath } from "@/components/app/logic/appUtils";
import { filterTasks } from "@/components/app/logic/filterTasks";
import {
  buildWorkspaceTaskSectionGroups,
  getTaskAssignments,
  getTaskBoardSections
} from "@/components/app/logic/taskBoardUtils";
import { TaskCenterHeader } from "@/components/app/tasks/TaskCenterHeader";
import { TaskBoardColumn } from "@/components/app/tasks/TaskBoardColumn";
import { TaskItem } from "@/components/app/tasks/TaskItem";
import { TaskSelectionBar } from "@/components/app/tasks/TaskSelectionBar";
import type { DraggedTask, TaskBoardPanelProps } from "@/components/app/types/component.types";
import type { TaskStatusFilter } from "@/components/app/types/taskCenter.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TaskBoardPanel(props: TaskBoardPanelProps) {
  const {
    workspaces,
    activeWorkspaceId,
    viewMode,
    selectedTaskKeys,
    isStartingThreads,
    onViewModeChange,
    onSelectWorkspace,
    onToggleTaskSelection,
    onOpenTask,
    onCreateTask,
    onGenerateTasks,
    onToggleTaskComplete,
    onDeleteTask,
    onMoveTask,
    onCreateSection,
    onRenameSection,
    onDeleteSection,
    generateTasksRequest,
    onClose
  } = props;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatusFilter>("open");
  const [draggedTask, setDraggedTask] = useState<DraggedTask>(null);
  const [sectionDraft, setSectionDraft] = useState("");
  const [isGenerateTasksDialogOpen, setIsGenerateTasksDialogOpen] = useState(false);
  const activeWorkspace =
    workspaces.find((workspace) => workspace.projectId === activeWorkspaceId) ?? workspaces[0] ?? null;
  const activeWorkspaceSections = activeWorkspace ? getTaskBoardSections(activeWorkspace.board) : [];
  const visibleTasks = filterTasks(activeWorkspace?.tasks ?? [], query, status);
  const groups = activeWorkspace ? buildWorkspaceTaskSectionGroups(visibleTasks, activeWorkspace.board) : [];
  const openCount = activeWorkspace?.tasks.filter((task) => !task.completed).length ?? 0;
  const completedCount = (activeWorkspace?.tasks.length ?? 0) - openCount;
  const isLoading = activeWorkspace?.isTasksLoading || activeWorkspace?.isBoardLoading;
  const error = activeWorkspace?.tasksErrorMessage || activeWorkspace?.boardErrorMessage;

  useEffect(() => {
    setSectionDraft("");
    setDraggedTask(null);
  }, [activeWorkspace?.projectId]);

  useEffect(() => {
    if (generateTasksRequest) setIsGenerateTasksDialogOpen(true);
  }, [generateTasksRequest]);

  const submitNewSection = (): void => {
    if (!activeWorkspace || !sectionDraft.trim()) return;
    void onCreateSection(activeWorkspace.projectId, sectionDraft.trim());
    setSectionDraft("");
  };

  return (
    <section aria-label="Task center" className="flex h-full min-h-0 flex-col bg-background">
      <TaskCenterHeader
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        viewMode={viewMode}
        openCount={openCount}
        completedCount={completedCount}
        query={query}
        status={status}
        onQueryChange={setQuery}
        onStatusChange={setStatus}
        onViewModeChange={onViewModeChange}
        onSelectWorkspace={onSelectWorkspace}
        onCreateTask={onCreateTask}
        onGenerate={() => setIsGenerateTasksDialogOpen(true)}
        onClose={onClose}
      />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5 sm:px-8">
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {isLoading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading tasks…
          </div>
        ) : !activeWorkspace ? (
          <div className="py-20 text-center">
            <FolderKanban className="mx-auto mb-4 size-7 text-muted-foreground/50" />
            <h2 className="text-sm font-medium">Choose a workspace to get started</h2>
            <p className="mt-2 text-xs text-muted-foreground">Your project tasks will appear here.</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="mx-auto max-w-5xl space-y-6">
            {groups
              .filter((group) => group.tasks.length > 0)
              .map(({ section, tasks }) => (
                <section key={section.id} aria-label={section.title}>
                  <div className="mb-2 flex items-center gap-2 px-3">
                    <span className="size-1.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                    <h2 className="text-xs font-medium">{section.title}</h2>
                    <span className="text-[11px] tabular-nums text-muted-foreground">{tasks.length}</span>
                  </div>
                  <div className="border-y border-border/50">
                    {tasks.map((task) => (
                      <TaskItem
                        key={task.path}
                        task={task}
                        layout="list"
                        assignmentCount={getTaskAssignments(task.path, activeWorkspace.board).length}
                        selected={selectedTaskKeys.includes(`${activeWorkspace.projectId}:${task.path}`)}
                        selectionDisabled={isStartingThreads}
                        onToggleSelection={() => onToggleTaskSelection(activeWorkspace.projectId, task.path)}
                        onOpen={() => onOpenTask(activeWorkspace.projectId, task.path)}
                        onToggleComplete={() =>
                          onToggleTaskComplete(
                            activeWorkspace.projectId,
                            task.path,
                            resolveTaskCompletionTogglePath(task.path, task.completed)
                          )
                        }
                        onDelete={() => onDeleteTask(activeWorkspace.projectId, task.path)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            {!visibleTasks.length && (
              <div className="py-16 text-center">
                <FolderKanban className="mx-auto mb-4 size-7 text-muted-foreground/40" aria-hidden="true" />
                <h2 className="text-sm font-medium">
                  {query.trim()
                    ? "No matching tasks"
                    : status === "completed"
                      ? "No completed tasks yet"
                      : status === "open" && completedCount > 0
                        ? "You’re all caught up"
                        : "Make room for your next idea"}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {query.trim()
                    ? "Try a different title or file path."
                    : "Create a task or generate a plan from a brief, then hand it to an agent."}
                </p>
                {query.trim() ? (
                  <Button variant="ghost" size="sm" className="mt-4" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => onCreateTask(activeWorkspace.projectId)}
                  >
                    <Plus className="size-3.5" />
                    New task
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-full items-start gap-3 pb-3">
            {groups.map(({ section, tasks }) => (
              <TaskBoardColumn
                key={`${activeWorkspace.projectId}:${section.id}`}
                section={section}
                count={tasks.length}
                canDelete={activeWorkspaceSections.length > 1}
                canDrop={draggedTask?.projectId === activeWorkspace.projectId}
                onDrop={() => {
                  if (!draggedTask) return;
                  const task = draggedTask;
                  setDraggedTask(null);
                  void onMoveTask(activeWorkspace.projectId, task.taskPath, section.id);
                }}
                onRename={(title) => onRenameSection(activeWorkspace.projectId, section.id, title)}
                onDelete={() => onDeleteSection(activeWorkspace.projectId, section.id)}
              >
                {!tasks.length && (
                  <p className="px-3 py-8 text-center text-xs text-muted-foreground/70">
                    {query.trim() ? "No matching tasks" : "No tasks in this section"}
                  </p>
                )}
                {tasks.map((task) => (
                  <TaskItem
                    layout="board"
                    selectionDisabled={isStartingThreads}
                    key={task.path}
                    assignmentCount={getTaskAssignments(task.path, activeWorkspace.board).length}
                    selected={selectedTaskKeys.includes(`${activeWorkspace.projectId}:${task.path}`)}
                    task={task}
                    onToggleSelection={() => onToggleTaskSelection(activeWorkspace.projectId, task.path)}
                    onOpen={() => onOpenTask(activeWorkspace.projectId, task.path)}
                    onToggleComplete={() =>
                      onToggleTaskComplete(
                        activeWorkspace.projectId,
                        task.path,
                        resolveTaskCompletionTogglePath(task.path, task.completed)
                      )
                    }
                    onDelete={() => onDeleteTask(activeWorkspace.projectId, task.path)}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", task.path);
                      setDraggedTask({
                        projectId: activeWorkspace.projectId,
                        taskPath: task.path
                      });
                    }}
                    onDragEnd={() => setDraggedTask(null)}
                  />
                ))}
              </TaskBoardColumn>
            ))}

            <form
              className="w-56 shrink-0 rounded-lg border border-dashed border-border/70 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                submitNewSection();
              }}
            >
              <label htmlFor="task-section-title" className="mb-2 block text-xs font-medium text-muted-foreground">
                Add section
              </label>
              <div className="flex items-center gap-1">
                <Input
                  id="task-section-title"
                  value={sectionDraft}
                  onChange={(event) => setSectionDraft(event.target.value)}
                  placeholder="Section name…"
                  className="h-8 min-w-0 text-xs"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  disabled={!sectionDraft.trim()}
                  aria-label="Add section"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
      {selectedTaskKeys.length > 0 && (
        <TaskSelectionBar
          selectedCount={selectedTaskKeys.length}
          isStartingThreads={isStartingThreads}
          onClearTaskSelection={props.onClearTaskSelection}
          onStartSelectedThreads={props.onStartSelectedThreads}
        />
      )}
      <GenerateTasksDialog
        open={isGenerateTasksDialogOpen}
        workspaces={workspaces.map((workspace) => ({
          projectId: workspace.projectId,
          projectName: workspace.projectName,
          projectRootPath: workspace.projectRootPath,
          specs: workspace.specs
        }))}
        defaultWorkspaceId={generateTasksRequest?.projectId ?? activeWorkspace?.projectId ?? null}
        defaultSpecPath={generateTasksRequest?.specPath ?? null}
        onOpenChange={setIsGenerateTasksDialogOpen}
        onSubmit={async ({ projectId, brief, specPath }) => {
          await onGenerateTasks(projectId, brief, specPath);
          setIsGenerateTasksDialogOpen(false);
        }}
      />
    </section>
  );
}
