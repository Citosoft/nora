import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { AppActivityEntry } from "@shared/types/apps/apps.types";
import type { AppActivityDialogProps } from "@/components/app/types/appsView.types";
import { Dialog, DialogBody, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { AppActionArgs } from "./AppActionArgs";

/** Everything the app has done to real data: each action, when, with what, and what the tool said back. */
export function AppActivityDialog({ open, onOpenChange, load }: AppActivityDialogProps) {
  const [entries, setEntries] = useState<AppActivityEntry[] | null>(null);
  useEffect(() => { if (!open) return; let active = true; setEntries(null); load().then((list) => { if (active) setEntries(list); }, () => { if (active) setEntries([]); }); return () => { active = false; }; }, [open, load]);
  if (!open) return null;
  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="w-[min(40rem,calc(100vw-2rem))]" onClose={() => onOpenChange(false)} headerTitle="Activity">
      <DialogDescription className="px-5">Every action this app ran through a connector, newest first.</DialogDescription>
      <DialogBody className="thin-scrollbar max-h-[60vh] px-5 py-4">
        {entries === null ? <p className="text-sm text-muted-foreground">Loading…</p>
          : entries.length === 0 ? <p className="text-sm text-muted-foreground">Nothing yet. Actions the app runs will be listed here.</p>
          : <ol className="space-y-3">{entries.map((entry) => <li key={entry.id} className="rounded-lg border border-border/70 bg-card p-3 text-sm">
            <div className="flex items-start gap-2">
              {entry.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{entry.actionId} <span className="font-normal text-muted-foreground">· {entry.tool} on {entry.connectorName}</span></p>
                <p className="text-xs text-muted-foreground">{new Date(entry.at).toLocaleString()} · {entry.confirmed ? "confirmed by you" : "ran without confirming (trusted app)"}</p>
              </div>
            </div>
            <AppActionArgs args={entry.args} className="mt-2" />
            <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">{entry.message}</p>
          </li>)}</ol>}
      </DialogBody>
    </DialogContent>
  </Dialog>;
}
