import type { ResetWorkspacesDialogProps } from "@/components/app/types/component.types";
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

export function ResetWorkspacesDialog({
  open,
  onOpenChange,
  onConfirm
}: ResetWorkspacesDialogProps) {
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsResetting(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent headerTitle="Reset Workspaces">
        <DialogHeader>
          <DialogDescription>
            This clears all {APP_SHORT_NAME}-managed workspace records, sessions, and managed checkout directories. It does not change your sidebar layout, theme, or tool configuration.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="rounded-[4px] border border-destructive/25 bg-destructive/5 p-3 text-sm text-muted-foreground">
            Local repositories you opened directly are not deleted. Only {APP_SHORT_NAME}-managed workspace state and managed worktree checkout directories are cleared.
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isResetting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setIsResetting(true);
              void onConfirm().finally(() => {
                setIsResetting(false);
              });
            }}
            disabled={isResetting}
          >
            {isResetting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Reset workspaces
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
