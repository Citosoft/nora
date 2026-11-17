import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { GitBranch, LoaderCircle } from "lucide-react";
import { noraSessionClient } from "@/components/app/clients/noraSessionClient";
import type { CreateWorktreeDialogProps } from "@/components/app/types/worktreeCreation.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateWorktreeDialog({ project, onClose }: CreateWorktreeDialogProps) {
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = async (): Promise<void> => {
    if (busy || !branch.trim()) return;
    setBusy(true); setError(null);
    try { await noraSessionClient.createWorktree({ projectId: project.id, branch: branch.trim() }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The worktree could not be created. Try again."); }
    finally { setBusy(false); }
  };
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border bg-card shadow-panel outline-none">
        <form onSubmit={(event) => { event.preventDefault(); void create(); }} aria-busy={busy}>
          <div className="space-y-4 p-6">
            <Dialog.Title className="flex items-center gap-2 text-lg font-semibold"><GitBranch className="size-5 text-muted-foreground" aria-hidden="true" />New worktree</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">Create a separate checkout for {project.name} on a new branch, starting from the workspace’s current HEAD.</Dialog.Description>
            <label className="block space-y-2 text-sm"><span className="font-medium">Branch name</span><Input autoFocus value={branch} onChange={(event) => { setBranch(event.target.value); setError(null); }} placeholder="feature/my-worktree" maxLength={200} disabled={busy} required autoComplete="off" spellCheck={false} /></label>
            <p className="text-xs text-muted-foreground">Creates the worktree only. Start a thread or terminal in it when you’re ready.</p>
            {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <Dialog.Close asChild><Button type="button" variant="ghost" disabled={busy}>Cancel</Button></Dialog.Close>
            <Button type="submit" disabled={!branch.trim() || busy}>{busy && <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />}{busy ? "Creating…" : "Create worktree"}</Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
