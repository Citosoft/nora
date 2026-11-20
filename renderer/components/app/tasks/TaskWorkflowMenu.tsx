import { Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useLoopDefinitionList } from "@/components/app/hooks/useLoopDefinitionList";
import type { TaskWorkflowMenuItemsProps, TaskWorkflowMenuProps } from "@/components/app/types/taskCenter.types";

/** Menu content mounts only while open, so each opening lists the workspace's current saved workflows. */
function TaskWorkflowMenuItems({ actions }: TaskWorkflowMenuItemsProps) {
  const { definitions, isLoading, errorMessage } = useLoopDefinitionList(actions.projectId);
  return <>
    <DropdownMenuLabel>Run a workflow on this task</DropdownMenuLabel>
    {isLoading ? <DropdownMenuItem disabled>Loading workflows…</DropdownMenuItem>
      : errorMessage ? <DropdownMenuItem disabled>{errorMessage}</DropdownMenuItem>
      : definitions.length ? definitions.map((definition) => (
        <DropdownMenuItem key={definition.id} onSelect={() => actions.onRun(definition.id)}>
          <span className="truncate">{definition.name}</span>
        </DropdownMenuItem>
      ))
      : <DropdownMenuItem disabled>No saved workflows yet</DropdownMenuItem>}
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={actions.onOpenWorkflows}>
      <Repeat2 className="size-3.5" aria-hidden="true" />
      Manage workflows
    </DropdownMenuItem>
  </>;
}

export function TaskWorkflowMenu({ taskTitle, actions, disabled }: TaskWorkflowMenuProps) {
  return (
    <DropdownMenu
      widthClassName="w-60"
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          disabled={disabled}
          aria-label={`Run a workflow on ${taskTitle}`}
          aria-haspopup="menu"
          tooltip="Run workflow"
        >
          <Repeat2 className="size-3.5" aria-hidden="true" />
        </Button>
      }
    >
      <TaskWorkflowMenuItems actions={actions} />
    </DropdownMenu>
  );
}
