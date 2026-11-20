import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ConfirmActionSheetProps } from "@/components/app/types/apps.types";
import { AppActionArgs } from "./AppActionArgs";

/** A write to a connector says plainly what it will do and with what, before it does it; trusting the app in its menu skips this. */
export function ConfirmActionSheet({ pending, onConfirm, onCancel }: ConfirmActionSheetProps) {
  const wording = pending.action.confirm ?? `This sends the values below to ${pending.connectorName}.`;
  return <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
    <DialogContent className="w-[min(480px,calc(100vw-2rem))]" onClose={onCancel} headerTitle="Before this runs">
      <DialogBody className="px-5 pb-4">
        <DialogHeader>
          <DialogTitle className="sr-only">Confirm {pending.actionId}</DialogTitle>
          <DialogDescription className="text-foreground">{wording}</DialogDescription>
          <p className="text-xs text-muted-foreground">Runs {pending.action.tool} on {pending.connectorName}. Every run is kept in the app's Activity.</p>
        </DialogHeader>
        <AppActionArgs args={pending.args} className="mt-3" />
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={onConfirm} autoFocus>Run</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
