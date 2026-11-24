import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import type { RemoteAccessControls } from "@/components/app/types/remoteAccess.types";

export function RemoteResetDialog({ controls, open, onOpenChange }: { controls: RemoteAccessControls; open: boolean; onOpenChange(open: boolean): void }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/80" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border border-border bg-card p-6 shadow-panel">
        <Dialog.Title className="font-semibold">Reset remote connection?</Dialog.Title>
        <Dialog.Description className="text-sm text-muted-foreground">Connector credentials are replaced and existing remote sessions disconnect. Your conversations remain on this computer.</Dialog.Description>
        <div className="flex justify-end gap-2"><Dialog.Close asChild><Button variant="outline" disabled={controls.pending}>Cancel</Button></Dialog.Close><Button disabled={controls.pending} onClick={() => { void controls.request({ kind: "rotate" }).then((ok) => { if (ok) onOpenChange(false); }); }}>Reset connection</Button></div>
        {controls.error ? <p role="alert" className="text-sm text-destructive">{controls.error}</p> : null}
      </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
