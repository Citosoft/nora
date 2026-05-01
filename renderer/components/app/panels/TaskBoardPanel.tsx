import { GenerateTasksDialog } from "@/components/app/dialogs/GenerateTasksDialog";
import { resolveTaskCompletionTogglePath } from "@/components/app/logic/appUtils";
import { buildWorkspaceTaskSectionGroups, getTaskAssignments, getTaskBoardSections } from "@/components/app/logic/taskBoardUtils";
import type { TaskBoardViewMode } from "@/components/app/types";
import type { DraggedTask, TaskBoardPanelProps } from "@/components/app/types/component.types";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { WorkspaceTaskSummary } from "@shared/appTypes";
import { CheckCircle2, Columns3, FileText, FolderKanban, ListTree, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState, type DragEvent } from "react";

export function TaskBoardPanel({
  workspaces,
  availableTools,
  activeWorkspaceId,
  viewMode,
  selectedTaskKeys,
  selectedToolId,
  isSpawningAgents,
  onViewModeChange,
  onSelectWorkspace,
  onToggleTaskSelection,
  onClearTaskSelection,
  onSelectedToolChange,
  onSpawnSelectedAgents,
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
}: TaskBoardPanelProps) {
  const [draggedTask, setDraggedTask] = useState<DraggedTask>(null);
  const [sectionDraft, setSectionDraft] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [isGenerateTasksDialogOpen, setIsGenerateTasksDialogOpen] = useState(false);
  const activeWorkspace =
    workspaces.find((workspace) => workspace.projectId === activeWorkspaceId) ||
    workspaces[0] ||
    null;
  const activeWorkspaceSections = activeWorkspace ? getTaskBoardSections(activeWorkspace.board) : [];
  const visibleBoardTasks = activeWorkspace
    ? buildWorkspaceTaskSectionGroups(activeWorkspace.tasks.filter((task) => !task.completed), activeWorkspace.board)
    : [];
  const hiddenCompletedCount = activeWorkspace?.tasks.filter((task) => task.completed).length ?? 0;
  const selectedTaskCount = selectedTaskKeys.length;

  const submitNewSection = (): void => {
    if (!activeWorkspace || !sectionDraft.trim()) {
      return;
    }

    void onCreateSection(activeWorkspace.projectId, sectionDraft.trim());
    setSectionDraft("");
  };

  useEffect(() => {
    setEditingSectionId(null);
    setEditingSectionTitle("");
  }, [activeWorkspace?.projectId]);

  useEffect(() => {
    if (!generateTasksRequest) {
      return;
    }

    setIsGenerateTasksDialogOpen(true);
  }, [generateTasksRequest]);

  const submitSectionRename = (): void => {
    if (!activeWorkspace || !editingSectionId) {
      return;
    }

    const trimmedTitle = editingSectionTitle.trim();
    const currentTitle = activeWorkspaceSections.find((section) => section.id === editingSectionId)?.title ?? "";
    if (!trimmedTitle || trimmedTitle === currentTitle) {
      setEditingSectionId(null);
      setEditingSectionTitle("");
      return;
    }

    void onRenameSection(activeWorkspace.projectId, editingSectionId, trimmedTitle);
    setEditingSectionId(null);
    setEditingSectionTitle("");
  };

  const workspaceSelectClassName =
    "h-9 min-w-[10rem] max-w-[16rem] rounded-[5px] border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border/60 px-6 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <FolderKanban className="size-4 shrink-0" />
            Task Center
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Close task center">
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Tabs value={viewMode} onValueChange={(nextValue) => onViewModeChange(nextValue as TaskBoardViewMode)}>
              <TabsList className="h-9">
                <TabsTrigger value="list" className="whitespace-nowrap px-3">
                  <ListTree className="size-4" />
                  List
                </TabsTrigger>
                <TabsTrigger value="board" className="whitespace-nowrap px-3">
                  <Columns3 className="size-4" />
                  Board
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {workspaces.length > 1 && activeWorkspace ? (
              <select
                value={activeWorkspace.projectId}
                onChange={(event) => onSelectWorkspace(event.target.value)}
                className={workspaceSelectClassName}
                aria-label="Active workspace for board and actions"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.projectId} value={workspace.projectId}>
                    {workspace.projectName}
                  </option>
                ))}
              </select>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              onClick={() => setIsGenerateTasksDialogOpen(true)}
              disabled={!activeWorkspace || !availableTools.length}
            >
              <Plus className="size-4" />
              Generate tasks
            </Button>

            {viewMode === "board" && activeWorkspace ? (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:min-w-[12rem]">
                <Input
                  value={sectionDraft}
                  onChange={(event) => setSectionDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitNewSection();
                    }
                  }}
                  placeholder="New section"
                  className="h-9 min-w-[6rem] flex-1 sm:max-w-[11rem]"
                />
                <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={submitNewSection} disabled={!sectionDraft.trim()}>
                  <Plus className="size-4" />
                  Section
                </Button>
                <Button variant="default" size="sm" className="h-9 shrink-0" onClick={() => onCreateTask(activeWorkspace.projectId)}>
                  <Plus className="size-4" />
                  Task
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end lg:shrink-0 lg:border-l lg:border-border/50 lg:pl-6">
            <span className="w-full text-xs tabular-nums text-muted-foreground sm:w-auto sm:shrink-0">
              {selectedTaskCount === 0 ? "No tasks selected" : `${selectedTaskCount} selected`}
            </span>
            <Select
              className="h-9 min-w-0 w-full sm:w-[13.5rem]"
              value={selectedToolId}
              onChange={(event) => onSelectedToolChange(event.target.value)}
              aria-label="Select agent CLI for selected tasks"
              disabled={!availableTools.length || isSpawningAgents}
            >
              <option value="">Choose agent CLI</option>
              {availableTools.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  <span className="flex min-w-0 items-center gap-2">
                    <AgentToolIcon
                      toolId={tool.id}
                      label={tool.label}
                      className="size-5 shrink-0 rounded-sm"
                      imageClassName="size-4 rounded-sm"
                    />
                    <span className="min-w-0 truncate">{tool.label}</span>
                  </span>
                </option>
              ))}
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              onClick={onClearTaskSelection}
              disabled={!selectedTaskCount || isSpawningAgents}
            >
              Clear
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-9 shrink-0"
              onClick={() => void onSpawnSelectedAgents()}
              disabled={!selectedTaskCount || !selectedToolId || isSpawningAgents}
            >
              {isSpawningAgents ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Start agents
            </Button>
          </div>
        </div>
      </div>
      <GenerateTasksDialog
        open={isGenerateTasksDialogOpen}
        workspaces={workspaces.map((workspace) => ({
          projectId: workspace.projectId,
          projectName: workspace.projectName,
          projectRootPath: workspace.projectRootPath,
          specs: workspace.specs
        }))}
        tools={availableTools}
        defaultWorkspaceId={generateTasksRequest?.projectId ?? activeWorkspace?.projectId ?? null}
        defaultToolId={selectedToolId}
        defaultSpecPath={generateTasksRequest?.specPath ?? null}
        onOpenChange={setIsGenerateTasksDialogOpen}
        onSubmit={async ({ projectId, toolId, brief, specPath }) => {
          await onGenerateTasks(projectId, toolId, brief, specPath);
          setIsGenerateTasksDialogOpen(false);
        }}
      />
      <div className="min-h-0 flex-1">
        <Tabs value={viewMode} className="h-full">
          <TabsContent value="list" className="h-full">
            <ScrollArea className="h-full px-6 py-5">
              <div className="space-y-5">
                {workspaces.length ? (
                  workspaces.map((workspace) => {
                    const groups = buildWorkspaceTaskSectionGroups(workspace.tasks, workspace.board).filter(
                      (group) => group.tasks.length > 0
                    );

                    return (
                      <Card key={workspace.projectId} className="overflow-hidden">
                        <div className="border-b border-border/60 px-5 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-foreground">{workspace.projectName}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{workspace.projectRootPath}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{workspace.tasks.length} tasks</Badge>
                              <Button variant="outline" size="sm" onClick={() => onCreateTask(workspace.projectId)}>
                                <Plus className="size-4" />
                                Task
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  onSelectWorkspace(workspace.projectId);
                                  onViewModeChange("board");
                                }}
                              >
                                <Columns3 className="size-4" />
                                Board
                              </Button>
                            </div>
                          </div>
                          {workspace.tasksErrorMessage || workspace.boardErrorMessage ? (
                            <div className="mt-3 text-sm text-destructive">
                              {workspace.tasksErrorMessage || workspace.boardErrorMessage}
                            </div>
                          ) : null}
                        </div>
                        <div className="px-5 py-4">
                          {workspace.isTasksLoading || workspace.isBoardLoading ? (
                            <div className="text-sm text-muted-foreground">Loading workspace tasks…</div>
                          ) : groups.length ? (
                            <div className="space-y-4">
                              {groups.map((group) => (
                                <div key={group.section.id}>
                                  <div className="mb-2 flex items-center gap-2">
                                    <Badge variant="outline">{group.section.title}</Badge>
                                    <span className="text-xs text-muted-foreground">{group.tasks.length}</span>
                                  </div>
                                  <div className="space-y-2">
                                    {group.tasks.map((task) => (
                                      <TaskListRow
                                        key={task.path}
                                        assignmentCount={getTaskAssignments(task.path, workspace.board).length}
                                        selected={selectedTaskKeys.includes(`${workspace.projectId}:${task.path}`)}
                                        task={task}
                                        onToggleSelection={() => onToggleTaskSelection(workspace.projectId, task.path)}
                                        onOpen={() => onOpenTask(workspace.projectId, task.path)}
                                        onToggleComplete={() =>
                                          onToggleTaskComplete(
                                            workspace.projectId,
                                            task.path,
                                            resolveTaskCompletionTogglePath(task.path, task.completed)
                                          )
                                        }
                                        onDelete={() => onDeleteTask(workspace.projectId, task.path)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No tasks yet for this workspace.</div>
                          )}
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <EmptyTaskBoardState />
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="board" className="h-full">
            <div className="flex h-full min-h-0 flex-col px-6 py-5">
              {!activeWorkspace ? (
                <EmptyTaskBoardState />
              ) : activeWorkspace.isTasksLoading || activeWorkspace.isBoardLoading ? (
                <div className="text-sm text-muted-foreground">Loading workspace board…</div>
              ) : activeWorkspace.tasksErrorMessage || activeWorkspace.boardErrorMessage ? (
                <div className="text-sm text-destructive">
                  {activeWorkspace.tasksErrorMessage || activeWorkspace.boardErrorMessage}
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-foreground">{activeWorkspace.projectName}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{activeWorkspace.projectRootPath}</div>
                    </div>
                    {hiddenCompletedCount ? (
                      <Badge variant="outline">{hiddenCompletedCount} completed hidden</Badge>
                    ) : null}
                  </div>
                  <ScrollArea className="min-h-0 flex-1">
                    <div className="flex min-h-full gap-4 pb-2">
                      {activeWorkspaceSections.map((section) => (
                        <div
                          key={section.id}
                          className="flex w-[320px] shrink-0 flex-col rounded-[4px] border border-border/70 bg-card/80"
                          onDragOver={(event) => {
                            if (draggedTask?.projectId === activeWorkspace.projectId) {
                              event.preventDefault();
                            }
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (!draggedTask || draggedTask.projectId !== activeWorkspace.projectId) {
                              return;
                            }
                            setDraggedTask(null);
                            void onMoveTask(activeWorkspace.projectId, draggedTask.taskPath, section.id);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                            <div>
                              {editingSectionId === section.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editingSectionTitle}
                                    onChange={(event) => setEditingSectionTitle(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        submitSectionRename();
                                      }
                                      if (event.key === "Escape") {
                                        event.preventDefault();
                                        setEditingSectionId(null);
                                        setEditingSectionTitle("");
                                      }
                                    }}
                                    className="h-8 w-40"
                                    autoFocus
                                    aria-label={`Rename ${section.title}`}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      submitSectionRename();
                                    }}
                                    aria-label={`Save ${section.title}`}
                                  >
                                    <Save className="size-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setEditingSectionId(null);
                                      setEditingSectionTitle("");
                                    }}
                                    aria-label={`Cancel renaming ${section.title}`}
                                  >
                                    <X className="size-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-sm font-semibold text-foreground">{section.title}</div>
                              )}
                              <div className="mt-1 text-xs text-muted-foreground">
                                {(visibleBoardTasks.find((group) => group.section.id === section.id)?.tasks.length ?? 0)} open
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setEditingSectionId(section.id);
                                  setEditingSectionTitle(section.title);
                                }}
                                aria-label={`Rename ${section.title}`}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => {
                                  if (!window.confirm(`Delete "${section.title}" and move its tasks to the first remaining section?`)) {
                                    return;
                                  }
                                  void onDeleteSection(activeWorkspace.projectId, section.id);
                                }}
                                aria-label={`Delete ${section.title}`}
                                disabled={activeWorkspaceSections.length <= 1}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="min-h-[240px] flex-1 space-y-3 p-3">
                            {(visibleBoardTasks.find((group) => group.section.id === section.id)?.tasks ?? []).map((task) => (
                              <TaskBoardCard
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
                                  setDraggedTask({
                                    projectId: activeWorkspace.projectId,
                                    taskPath: task.path
                                  });
                                }}
                                onDragEnd={() => setDraggedTask(null)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TaskListRow({
  assignmentCount,
  selected,
  task,
  onToggleSelection,
  onOpen,
  onToggleComplete,
  onDelete
}: {
  assignmentCount: number;
  selected: boolean;
  task: WorkspaceTaskSummary;
  onToggleSelection: () => void;
  onOpen: () => void;
  onToggleComplete: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-[4px] border px-3 py-3 text-left transition hover:border-primary/40 hover:bg-accent/30",
        selected ? "border-primary/50 bg-primary/5" : "border-border/60 bg-background/40"
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelection}
        aria-label={`Select ${task.title}`}
        className="size-4 rounded-[4px] border border-input bg-background"
      />
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <FileText className="size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-sm font-medium", task.completed ? "line-through text-muted-foreground" : "text-foreground")}>
            {task.title}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="truncate text-xs text-muted-foreground">{task.path}</div>
            {assignmentCount ? <Badge variant="outline">{assignmentCount} agents</Badge> : null}
          </div>
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={(event) => {
            event.stopPropagation();
            void onToggleComplete();
          }}
          aria-label={task.completed ? "Mark incomplete" : "Mark completed"}
        >
          <CheckCircle2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={(event) => {
            event.stopPropagation();
            void onDelete();
          }}
          aria-label="Delete task"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function TaskBoardCard({
  assignmentCount,
  selected,
  task,
  onToggleSelection,
  onOpen,
  onToggleComplete,
  onDelete,
  onDragStart,
  onDragEnd
}: {
  assignmentCount: number;
  selected: boolean;
  task: WorkspaceTaskSummary;
  onToggleSelection: () => void;
  onOpen: () => void;
  onToggleComplete: () => Promise<void>;
  onDelete: () => Promise<void>;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab p-3 active:cursor-grabbing",
        selected ? "border-primary/50 bg-primary/5" : "border-border/60 bg-background/80"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelection}
            aria-label={`Select ${task.title}`}
            className="size-4 rounded-[4px] border border-input bg-background"
          />
          Select
        </label>
        <Badge variant="outline">Markdown</Badge>
      </div>
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="text-sm font-medium text-foreground">{task.title}</div>
        <div className="mt-2 flex items-center gap-2">
          <div className="truncate text-xs text-muted-foreground">{task.path}</div>
          {assignmentCount ? <Badge variant="outline">{assignmentCount} agents</Badge> : null}
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => void onToggleComplete()} aria-label="Mark completed">
            <CheckCircle2 className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => void onDelete()} aria-label="Delete task">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EmptyTaskBoardState() {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded-[4px] border border-dashed border-border/70 bg-background/30 text-center">
      <div className="max-w-md px-6">
        <div className="text-lg font-semibold text-foreground">No workspace tasks yet</div>
        <div className="mt-2 text-sm text-muted-foreground">
          Create Markdown task files and organize them into board sections without moving task content into a database.
        </div>
      </div>
    </div>
  );
}
