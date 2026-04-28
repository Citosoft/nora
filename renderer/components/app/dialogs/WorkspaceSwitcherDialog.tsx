import type { WorkspaceSwitcherDialogProps } from "@/components/app/types/component.types";
import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Bot, Check, FolderGit2, TerminalSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function WorkspaceSwitcherDialog({
  open,
  onOpenChange,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace
}: WorkspaceSwitcherDialogProps) {
  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((left, right) => left.project.name.localeCompare(right.project.name)),
    [workspaces]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    const activeIndex = sortedWorkspaces.findIndex((workspace) => workspace.project.id === activeWorkspaceId);
    setSelectedIndex(activeIndex >= 0 ? activeIndex : 0);
  }, [activeWorkspaceId, open, sortedWorkspaces]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!sortedWorkspaces.length) {
        if (event.key === "Escape") {
          onOpenChange(false);
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => (current + 1) % sortedWorkspaces.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => (current - 1 + sortedWorkspaces.length) % sortedWorkspaces.length);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const selectedWorkspace = sortedWorkspaces[selectedIndex];
        if (selectedWorkspace) {
          onSelectWorkspace(selectedWorkspace.project.id);
          onOpenChange(false);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, onSelectWorkspace, open, selectedIndex, sortedWorkspaces]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle="Workspace Switcher"
        className="max-w-[640px]"
      >
        <DialogBody className="space-y-3 pt-0">
          <div className="text-sm text-muted-foreground">
            Use <span className="font-medium text-foreground">Up</span> and <span className="font-medium text-foreground">Down</span> to choose a workspace, then press <span className="font-medium text-foreground">Enter</span>.
          </div>
          {sortedWorkspaces.length ? (
            <div className="overflow-hidden rounded-[6px] border border-border/60 bg-background/30">
              {sortedWorkspaces.map((workspace, index) => {
                const isSelected = index === selectedIndex;
                const isActive = workspace.project.id === activeWorkspaceId;

                return (
                  <button
                    key={workspace.project.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left transition last:border-b-0",
                      isSelected ? "bg-accent/60" : "hover:bg-accent/30"
                    )}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => {
                      onSelectWorkspace(workspace.project.id);
                      onOpenChange(false);
                    }}
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-[6px] border border-border/60 bg-background/60 text-primary">
                      <FolderGit2 className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{workspace.project.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{workspace.project.rootPath}</div>
                    </div>
                    <div className="hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
                      <span className="inline-flex items-center gap-1">
                        <Bot className="size-3.5" />
                        {workspace.agents.length}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <TerminalSquare className="size-3.5" />
                        {workspace.terminals.length}
                      </span>
                    </div>
                    {isActive ? <Check className="size-4 shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[6px] border border-dashed border-border/70 bg-background/20 px-4 py-6 text-sm text-muted-foreground">
              No workspaces available.
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
