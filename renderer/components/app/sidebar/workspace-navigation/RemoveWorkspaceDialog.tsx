import * as Dialog from "@radix-ui/react-dialog";
import type { RemoveWorkspaceDialogProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";

/** Confirms removing a workspace from Nora; removal deletes Nora's saved sessions but never the folder. */
export function RemoveWorkspaceDialog({ workspace, onConfirm, onClose }: RemoveWorkspaceDialogProps) {
  const { name, rootPath } = workspace.project;
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content role="alertdialog" className="fixed left-1/2 top-1/2 z-[30001] w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card shadow-panel outline-none">
        <div className="space-y-2 px-5 pb-4 pt-5">
          <Dialog.Title className="text-base font-semibold">Remove {name}?</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Nora stops tracking this workspace and deletes its saved sessions. The folder and its files stay on disk, and you can add it again later.
          </Dialog.Description>
          <p className="truncate text-xs text-muted-foreground" title={rootPath}>{rootPath}</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t bg-muted/45 px-5 py-3">
          <Dialog.Close asChild><Button type="button" variant="ghost" autoFocus>Cancel</Button></Dialog.Close>
          <Button type="button" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { onConfirm(); onClose(); }}>Remove workspace</Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
