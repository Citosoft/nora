import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiscardDraftDialogProps } from "@/components/app/types/thread-workspace/settlement.types";

/** Confirms discarding a draft that still holds unsent text, attachments or references, which cannot be brought back. */
export function DiscardDraftDialog({ title, onDiscard, onClose }: DiscardDraftDialogProps) {
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card shadow-panel outline-none"
        onCloseAutoFocus={(event) => event.preventDefault()}>
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <Dialog.Title className="text-base font-semibold">Discard draft?</Dialog.Title>
          <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Close"><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
        </div>
        <Dialog.Description className="px-5 pb-4 text-sm text-muted-foreground">
          "{title}" and its unsent text and attachments will be deleted. This can't be undone.
        </Dialog.Description>
        <div className="flex items-center justify-end gap-2 border-t bg-muted/45 px-5 py-3">
          <Dialog.Close asChild><Button type="button" variant="ghost" autoFocus>Cancel</Button></Dialog.Close>
          <Button type="button" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { onDiscard(); onClose(); }}>Discard draft</Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
