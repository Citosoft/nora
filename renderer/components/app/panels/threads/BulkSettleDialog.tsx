import * as Dialog from "@radix-ui/react-dialog";
import { Pin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useBulkSettlement } from "@/components/app/hooks/useBulkSettlement";
import { canBulkSettleThread, settlementAgeOptions } from "@/components/app/logic/thread-workspace/bulkSettlement";
import type { BulkSettleDialogProps } from "@/components/app/types/thread-workspace/bulkSettlement.types";
import { ThreadAge } from "./ThreadAge";
import { ThreadRowIdentity } from "./ThreadRowIdentity";

export function BulkSettleDialog(props: BulkSettleDialogProps) {
  const { workspaces, onClose } = props;
  const state = useBulkSettlement(props);
  const busy = state.progress !== null;
  const failed = Object.keys(state.errors).length;
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] flex max-h-[min(520px,calc(100vh-3rem))] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-card shadow-panel outline-none">
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-4">
          <Dialog.Title className="text-base font-semibold">Settle threads</Dialog.Title>
          <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Close" disabled={busy}><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
        </div>
        <Dialog.Description className="px-5 pb-4 text-xs text-muted-foreground">
          Clear older threads from the current list. Settled threads keep their history and can be reopened.
        </Dialog.Description>
        <div className="shrink-0 space-y-2 border-y px-5 py-3">
          <label className="flex items-center justify-between gap-3 text-xs">Preselect inactive for more than
            <Select className="h-8 w-auto" value={state.days} disabled={busy} onChange={(event) => state.changeAge(Number(event.target.value))}>
              {settlementAgeOptions.map((days) => <option key={days} value={days}>{days} {days === 1 ? "day" : "days"}</option>)}
            </Select>
          </label>
          <p className="text-xs text-muted-foreground">Pinned threads and threads needing attention start unchecked. Running and queued threads cannot be settled.</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs text-muted-foreground" aria-live="polite">{state.chosen.length} of {state.candidates.length} selected</span>
            <Button variant="ghost" size="sm" disabled={busy} onClick={state.selectAll}>Select all</Button>
            <Button variant="ghost" size="sm" disabled={busy || !state.selected.size} onClick={state.clear}>Clear</Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2" aria-label="Threads to settle" aria-busy={busy}>
          {state.candidates.map((row) => <div key={row.id} className="rounded-md hover:bg-muted">
            <label className={`flex items-center gap-3 px-2 py-2 ${canBulkSettleThread(row) ? "cursor-pointer" : "opacity-50"}`}>
              <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={canBulkSettleThread(row) && state.selected.has(row.id)}
                disabled={busy || !canBulkSettleThread(row)} onChange={() => state.toggle(row.id)} aria-label={`Settle ${row.title}`} />
              <ThreadRowIdentity row={row} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs" title={row.title}>{row.title}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{workspaces.get(row.workspaceId)?.name ?? "Unavailable workspace"} · {row.status}</span>
              </span>
              {row.pinned && <Pin className="size-3 shrink-0 text-muted-foreground" aria-label="Pinned" />}
              <ThreadAge updatedAt={row.updatedAt} now={state.now} />
            </label>
            {state.errors[row.id] && <p role="alert" className="px-2 pb-2 text-xs text-destructive">{state.errors[row.id]}</p>}
          </div>)}
          {!state.candidates.length && <p className="px-2 py-6 text-center text-xs text-muted-foreground">No unsettled threads in this view.</p>}
        </div>
        <div className="shrink-0 space-y-2 border-t bg-muted/45 px-5 py-3">
          {failed > 0 && <div role="alert" className="space-y-1 text-xs text-destructive">
            <p>{failed} {failed === 1 ? "thread could" : "threads could"} not be settled. Successful updates were saved. Review the remaining threads and try again.</p>
            {Object.entries(state.errors).filter(([id]) => !state.candidates.some((row) => row.id === id)).map(([id, message]) => <p key={id}>{message}</p>)}
          </div>}
          {state.progress && <p role="status" className="text-xs text-muted-foreground">Settling {state.progress.processed} of {state.progress.total}…</p>}
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild><Button variant="ghost" disabled={busy}>Cancel</Button></Dialog.Close>
            <Button disabled={busy || !state.chosen.length} onClick={() => { void state.submit(); }}>{busy ? "Settling…" : `Settle ${state.chosen.length} ${state.chosen.length === 1 ? "thread" : "threads"}`}</Button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
