import { LoopDesignerDialog } from "@/components/app/dialogs/LoopDesignerDialog";
import { LoopRunDialog } from "@/components/app/dialogs/LoopRunDialog";
import { LoopRunMonitorDialog } from "@/components/app/dialogs/LoopRunMonitorDialog";
import { useWorkspaceLoops } from "@/components/app/hooks/useWorkspaceLoops";
import { WorkspaceSidebarChildSectionLabel } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarChildSectionLabel";
import type { LoopWorkspaceSectionProps } from "@/components/app/types/loopDesigner.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LoopDefinition, LoopRun } from "@shared/appTypes";
import { isLoopRunDeletable } from "@shared/loopRunLifecycle";
import { ChevronDown, ChevronRight, Pencil, Play, Plus, Repeat2, Trash2 } from "lucide-react";
import { useState } from "react";

export function LoopWorkspaceSection({ workspace, agentCatalog, onCreateChangeRequest }: LoopWorkspaceSectionProps) {
  const loops = useWorkspaceLoops(workspace.project.id);
  const [collapsed, setCollapsed] = useState(true);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [editing, setEditing] = useState<LoopDefinition | null>(null);
  const [launching, setLaunching] = useState<LoopDefinition | null>(null);
  const [selectedRun, setSelectedRun] = useState<LoopRun | null>(null);
  const recentRuns = loops.runs.slice(0, 5);

  function openMonitor(run: LoopRun): void {
    setSelectedRun(run);
    setMonitorOpen(true);
  }

  async function removeRun(run: LoopRun): Promise<void> {
    if (!window.confirm(`Delete the ${run.definition.name} workflow run?`)) {
      return;
    }
    const removed = await loops.removeRun(run.id);
    if (removed && selectedRun?.id === run.id) {
      setMonitorOpen(false);
      setSelectedRun(null);
    }
  }

  return <div className="py-1.5 pl-5 pr-4">
    <div className="flex items-center justify-between gap-3">
      <WorkspaceSidebarChildSectionLabel
        icon={<Repeat2 className="size-3.5" />}
        label="Workflows"
        count={loops.definitions.length}
      />
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            setEditing(null);
            setDesignerOpen(true);
          }}
          aria-label={`Create workflow for ${workspace.project.name}`}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand workflows section" : "Collapse workflows section"}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>
    </div>
    {!collapsed ? <div className="mt-1 space-y-1">
      {loops.errorMessage ? <div className="px-2 py-1 text-xs text-destructive">{loops.errorMessage}</div> : null}
      {loops.definitions.map((definition) => <div
        key={definition.id}
        className="flex items-center gap-1 rounded-[4px] px-2 py-1 hover:bg-accent/40"
      >
        <button
          className="min-w-0 flex-1 truncate text-left text-[13px] font-medium"
          onClick={() => {
            setLaunching(definition);
            setRunDialogOpen(true);
          }}
        >
          {definition.name}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => {
            setEditing(definition);
            setDesignerOpen(true);
          }}
          aria-label={`Edit ${definition.name}`}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => {
            setLaunching(definition);
            setRunDialogOpen(true);
          }}
          aria-label={`Run ${definition.name}`}
        >
          <Play className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => void loops.removeDefinition(definition.id)}
          aria-label={`Delete ${definition.name}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>)}
      {recentRuns.length ? <div className="border-t border-border/60 pt-1">
        {recentRuns.map((run) => {
          const canDelete = isLoopRunDeletable(run.status);
          return <div
            key={run.id}
            className="flex items-center gap-1 rounded-[4px] px-2 py-1 hover:bg-accent/40"
          >
            <button
              className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
              onClick={() => openMonitor(run)}
            >
              <span className="truncate text-xs">{run.definition.name}</span>
              <Badge
                variant={run.status === "completed"
                  ? "success"
                  : run.status === "paused"
                    ? "warning"
                    : run.status === "cancelled"
                      ? "destructive"
                      : "outline"}
                className="px-1.5 py-0 text-[10px]"
              >
                {run.status}
              </Badge>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              disabled={!canDelete}
              title={canDelete ? "Delete workflow run" : "Pause or cancel this run before deleting it"}
              onClick={() => void removeRun(run)}
              aria-label={`Delete ${run.definition.name} workflow run`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>;
        })}
      </div> : null}
      {!loops.isLoading && loops.definitions.length === 0 ? <div className="rounded-[4px] border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground">
        No workflows yet.
      </div> : null}
    </div> : null}
    <LoopDesignerDialog
      open={designerOpen}
      projectId={workspace.project.id}
      agentCatalog={agentCatalog}
      definition={editing}
      onOpenChange={setDesignerOpen}
      onSaved={loops.upsertDefinition}
    />
    <LoopRunDialog
      open={runDialogOpen}
      definition={launching}
      onOpenChange={setRunDialogOpen}
      onStarted={(run) => {
        loops.upsertRun(run);
        openMonitor(run);
      }}
    />
    <LoopRunMonitorDialog
      open={monitorOpen}
      run={selectedRun ? loops.runs.find((run) => run.id === selectedRun.id) ?? selectedRun : null}
      onOpenChange={setMonitorOpen}
      onRunChanged={(run) => {
        loops.upsertRun(run);
        setSelectedRun(run);
      }}
      onCreateChangeRequest={onCreateChangeRequest}
    />
  </div>;
}
