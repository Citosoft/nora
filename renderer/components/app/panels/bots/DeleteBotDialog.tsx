import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { sharedBotFileName, SHARED_BOT_DIRECTORY } from "@shared/bots/botFile";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { Button } from "@/components/ui/button";
import type { DeleteBotDialogProps } from "@/components/app/types/botNavigation.types";

/** Confirms deleting a bot from the Bots sidebar; stays open with the error when the delete is refused. */
export function DeleteBotDialog({ bot, onClose }: DeleteBotDialogProps) {
  const { request } = useNativeRuntimePorts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shared = bot.scope.kind === "workspace" && bot.scope.storage === "shared";
  const remove = async (): Promise<void> => {
    setBusy(true); setError(null);
    try { await request({ kind: "delete-bot", botId: bot.id, scope: bot.scope }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The bot could not be deleted. Try again."); setBusy(false); }
  };
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content role="alertdialog" className="fixed left-1/2 top-1/2 z-[30001] w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card shadow-panel outline-none">
        <div className="space-y-2 px-5 pb-4 pt-5">
          <Dialog.Title className="text-base font-semibold">Delete {bot.name}?</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            {bot.name} disappears from the Bots sidebar, and groups it's in can no longer get replies from it. Its existing threads and group replies keep their history.
          </Dialog.Description>
          {shared && <p className="text-sm text-muted-foreground">
            This removes <code>{SHARED_BOT_DIRECTORY}/{sharedBotFileName(bot.id)}</code> from the workspace, so collaborators who use it lose this bot too.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t bg-muted/45 px-5 py-3">
          <Dialog.Close asChild><Button type="button" variant="ghost" disabled={busy} autoFocus>Cancel</Button></Dialog.Close>
          <Button type="button" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={busy} onClick={() => void remove()}>{busy ? "Deleting…" : `Delete ${bot.name}`}</Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
