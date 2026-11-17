import { ArrowRight, FolderOpen, FolderPlus, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { NewProjectDialog } from "@/components/app/dialogs/NewProjectDialog";
import { ProjectDialogFrame } from "@/components/app/shared/ProjectDialogFrame";
import type { AddWorkspaceDialogProps } from "@/components/app/types/chromeDialog.types";
import { Button } from "@/components/ui/button";

export function AddWorkspaceDialog(props: AddWorkspaceDialogProps) {
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (!props.open) setCreating(false);
  }, [props.open]);

  if (creating) {
    return <NewProjectDialog {...props} onBack={() => setCreating(false)} />;
  }

  return (
    <ProjectDialogFrame
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Add project"
      description="Open a project or start something new."
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {(
            [
              {
                label: "Local folder",
                description:
                  "Open a folder on this computer or a mounted drive.",
                icon: FolderOpen,
                onClick: props.onChooseLocal,
              },
              {
                label: "Remote over SSH",
                description:
                  "Work on a server directly or mount a remote folder.",
                icon: Server,
                onClick: props.onChooseRemote,
              },
              {
                label: "New project",
                description: "Choose a framework and let an agent set it up.",
                icon: FolderPlus,
                onClick: () => setCreating(true),
              },
            ] as const
          ).map(({ label, description, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="group flex w-full items-center gap-3 px-3 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted/60 text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {description}
                </span>
              </span>
              <ArrowRight
                className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end border-t border-border bg-muted/30 px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => props.onOpenChange(false)}
        >
          Cancel
        </Button>
      </div>
    </ProjectDialogFrame>
  );
}
