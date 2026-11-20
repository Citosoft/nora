import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { DeleteVaultSecretDialogProps } from "@/components/app/types/secretVault.types";
import { Button } from "@/components/ui/button";

/** Confirms deleting a saved secret, since its value cannot be recovered afterwards. */
export function DeleteVaultSecretDialog({ secret, scopeLabel, onClose, onDelete }: DeleteVaultSecretDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { setError(null); setDeleting(false); }, [secret]);
  const confirm = async (): Promise<void> => {
    if (!secret) return;
    setDeleting(true);
    try { await onDelete(secret); onClose(); }
    catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : "The secret could not be deleted."); setDeleting(false); }
  };
  return <Dialog.Root open={secret !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/80" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border border-border bg-card p-6 shadow-panel">
        <Dialog.Title className="font-semibold">Delete <span className="font-mono">{secret?.name}</span>?</Dialog.Title>
        <Dialog.Description className="text-sm text-muted-foreground">
          Agents will no longer be able to use it ({scopeLabel}). Its value cannot be recovered; you would need to enter it again.
        </Dialog.Description>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Dialog.Close asChild><Button variant="outline" disabled={deleting}>Cancel</Button></Dialog.Close>
          <Button className="border-destructive/60 bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting} onClick={() => void confirm()}>{deleting ? "Deleting…" : "Delete secret"}</Button>
        </div>
      </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
