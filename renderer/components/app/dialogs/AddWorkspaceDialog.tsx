import type { AddWorkspaceDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader
} from "@/components/ui/dialog";
import { HardDrive, ServerCog } from "lucide-react";

export function AddWorkspaceDialog({
  open,
  onOpenChange,
  onChooseLocal,
  onChooseRemote
}: AddWorkspaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} headerTitle="Add workspace">
        <DialogHeader>
          <DialogDescription>Choose whether this repository lives on the local machine or over SSH.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <button
            type="button"
            onClick={onChooseLocal}
            className="flex w-full items-start gap-3 rounded-[4px] border border-border/70 bg-background/40 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-accent/30"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-[4px] border border-border/70 bg-background/60 text-primary">
              <HardDrive className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">Local folder</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Pick a repository from a local disk or an already mounted network drive.
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={onChooseRemote}
            className="flex w-full items-start gap-3 rounded-[4px] border border-border/70 bg-background/40 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-accent/30"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-[4px] border border-border/70 bg-background/60 text-primary">
              <ServerCog className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">Remote over SSH</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Mount an SSH host, then choose a repository on it as if it were local.
              </div>
            </div>
          </button>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
