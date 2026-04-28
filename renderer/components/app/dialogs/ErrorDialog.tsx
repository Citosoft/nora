import type { ErrorDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

export function ErrorDialog({
  open,
  message,
  onOpenChange
}: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        headerTitle={
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            Error
          </span>
        }
      >
        <DialogBody>
          <div className="rounded-[4px] border border-destructive/25 bg-destructive/5 p-3 text-sm text-foreground">
            {message || "An unexpected error occurred."}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
