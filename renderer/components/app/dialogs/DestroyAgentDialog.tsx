import type { DestroyAgentDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { APP_SHORT_NAME } from "@shared/appMeta";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function DestroyAgentDialog({
  agent,
  open,
  onOpenChange,
  onConfirm
}: DestroyAgentDialogProps) {
  const [isDestroying, setIsDestroying] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsDestroying(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent headerTitle="Destroy Agent">
        <DialogHeader>
          <DialogDescription>
            This will stop the agent. If no other agents are attached, {APP_SHORT_NAME} will also remove the worktree.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {agent ? (
            <div className="rounded-[4px] border border-destructive/25 bg-destructive/5 p-3 text-sm">
              <div><span className="font-medium">Agent:</span> {agent.name}</div>
              <div><span className="font-medium">Branch:</span> {agent.branch}</div>
              <div className="truncate"><span className="font-medium">Workspace:</span> {agent.workspace}</div>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDestroying}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setIsDestroying(true);
              void onConfirm().finally(() => {
                setIsDestroying(false);
              });
            }}
            disabled={!agent || isDestroying}
          >
            {isDestroying ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Destroy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
