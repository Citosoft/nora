import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RenameThreadDialogProps } from "@/components/app/types/thread-workspace/settlement.types";

const TITLE_MAX = 200;

/** Renames a thread or group chat; stays open with the error when the rename is refused. */
export function RenameThreadDialog({ noun, title, onRename, onClose }: RenameThreadDialogProps) {
  const [value, setValue] = useState(title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = value.trim();
  const save = async (): Promise<void> => {
    if (!next || next === title) { onClose(); return; }
    setBusy(true); setError(null);
    try { await onRename(next); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : `The ${noun} could not be renamed.`); setBusy(false); }
  };
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card shadow-panel outline-none"
        onCloseAutoFocus={(event) => event.preventDefault()}>
        <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
            <Dialog.Title className="text-base font-semibold">Rename {noun}</Dialog.Title>
            <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Close" disabled={busy}><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Enter a new name for this {noun}.</Dialog.Description>
          <div className="space-y-2 px-5 pb-4">
            <Input autoFocus aria-label={`${noun[0].toUpperCase()}${noun.slice(1)} name`} value={value} maxLength={TITLE_MAX} disabled={busy}
              onFocus={(event) => event.currentTarget.select()} onChange={(event) => setValue(event.target.value)} />
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex items-center justify-end gap-2 border-t bg-muted/45 px-5 py-3">
            <Dialog.Close asChild><Button type="button" variant="ghost" disabled={busy}>Cancel</Button></Dialog.Close>
            <Button type="submit" disabled={busy || !next}>{busy ? "Renaming…" : "Rename"}</Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
