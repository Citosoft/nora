import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { ChatCloseThreadDialogProps } from "@/components/app/types/chatPanels.types";

/** Confirms closing a chat's branch or task tab, which settles its thread; a refusal (for example queued messages) is shown here. */
export function ChatCloseThreadDialog({ thread, onCancel, onConfirm }: ChatCloseThreadDialogProps) {
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setClosing(false); setError(null); }, [thread?.id]);
  const kind = thread?.branch ? "branch" : "task";
  const confirm = (): void => {
    if (!thread) return;
    setClosing(true); setError(null);
    void onConfirm(thread.id).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : `This ${kind} could not be closed.`))
      .finally(() => setClosing(false));
  };
  return <Dialog open={!!thread} onOpenChange={(open) => { if (!open && !closing) onCancel(); }}>
    <DialogContent headerTitle={`Close ${kind}?`}>
      <DialogBody className="space-y-2">
        <DialogDescription>
          “{thread?.title}” will be settled and its tab removed. Its history is kept, and you can reopen it from the sidebar.
        </DialogDescription>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={closing}>Keep {kind}</Button>
        <Button onClick={confirm} disabled={closing}>
          {closing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}Close {kind}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
