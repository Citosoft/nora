import type { RemoveMissingWorkspaceDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader
} from "@/components/ui/dialog";
import { APP_SHORT_NAME } from "@shared/appMeta";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function RemoveMissingWorkspaceDialog({
  projectRoot,
  errorMessage,
  open,
  onOpenChange,
  onConfirm
}: RemoveMissingWorkspaceDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsRemoving(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent headerTitle="Remove Missing Workspace">
        <DialogHeader>
          <DialogDescription>
            {APP_SHORT_NAME} could not open this workspace. It may belong to a remote mount that is no longer available.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="rounded-[4px] border border-destructive/25 bg-destructive/5 p-3 text-sm">
            {projectRoot ? (
              <div className="break-all">
                <span className="font-medium">Workspace:</span> {projectRoot}
              </div>
            ) : null}
            {errorMessage ? (
              <div className="mt-2 text-muted-foreground">{errorMessage}</div>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRemoving}>
            Keep workspace
          </Button>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setIsRemoving(true);
              void onConfirm().finally(() => {
                setIsRemoving(false);
              });
            }}
            disabled={!projectRoot || isRemoving}
          >
            {isRemoving ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Remove workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
