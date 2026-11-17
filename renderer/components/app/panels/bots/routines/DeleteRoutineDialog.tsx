import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import type { DeleteRoutineDialogProps } from "@/components/app/types/botRoutines.types";

/** Confirms deleting a routine; a run in progress is stopped and the routine's history goes with it. */
export function DeleteRoutineDialog({ routine, busy, onConfirm, onClose }: DeleteRoutineDialogProps) {
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content role="alertdialog" className="fixed left-1/2 top-1/2 z-[30001] w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card shadow-panel outline-none">
        <div className="space-y-2 px-5 pb-4 pt-5">
          <Dialog.Title className="text-base font-semibold">Delete {routine.name}?</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            It stops running, a run in progress is stopped, and its run history is removed. Threads it already worked in keep their history.
          </Dialog.Description>
        </div>
        <div className="flex items-center justify-end gap-2 border-t bg-muted/45 px-5 py-3">
          <Dialog.Close asChild><Button type="button" variant="ghost" disabled={busy} autoFocus>Cancel</Button></Dialog.Close>
          <Button type="button" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={busy} onClick={onConfirm}>
            {busy ? "Deleting…" : "Delete routine"}</Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
