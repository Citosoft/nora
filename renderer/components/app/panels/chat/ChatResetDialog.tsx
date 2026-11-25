import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { ChatResetDialogProps } from "@/components/app/types/chatPanels.types";

/** Confirms resetting a direct chat, which settles it and starts a fresh one; a refusal (for example queued messages) is shown here. */
export function ChatResetDialog({ open, name, onCancel, onConfirm }: ChatResetDialogProps) {
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setResetting(false); setError(null); } }, [open]);
  const confirm = (): void => {
    setResetting(true); setError(null);
    void onConfirm().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "This chat could not be reset."))
      .finally(() => setResetting(false));
  };
  return <Dialog open={open} onOpenChange={(next) => { if (!next && !resetting) onCancel(); }}>
    <DialogContent headerTitle={`Reset chat with ${name}?`}>
      <DialogBody className="space-y-2">
        <DialogDescription>
          This chat will be settled and a fresh one started. Its history and work threads are kept, and you can find it in the thread list.
        </DialogDescription>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={resetting}>Keep chat</Button>
        <Button onClick={confirm} disabled={resetting}>
          {resetting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}Reset chat</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
