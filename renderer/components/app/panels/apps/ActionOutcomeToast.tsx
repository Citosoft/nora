import { useEffect } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionOutcomeToastProps } from "@/components/app/types/appsView.types";

const DISMISS_AFTER_MS = 6_000;

/** What an action returned, shown over the app until it ages out or is closed. */
export function ActionOutcomeToast({ outcome, onDismiss }: ActionOutcomeToastProps) {
  useEffect(() => { const timer = setTimeout(onDismiss, DISMISS_AFTER_MS); return () => clearTimeout(timer); }, [outcome, onDismiss]);
  const Icon = outcome.isError ? XCircle : CheckCircle2;
  return <div role={outcome.isError ? "alert" : "status"} className="absolute bottom-4 right-4 z-20 flex max-w-sm items-start gap-2 rounded-md border bg-popover px-3 py-2 text-xs shadow-popover">
    <Icon className={`mt-0.5 size-4 shrink-0 ${outcome.isError ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`} aria-hidden="true" />
    <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{outcome.message}</p>
    <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0" aria-label="Dismiss" onClick={onDismiss}><X className="size-3.5" aria-hidden="true" /></Button>
  </div>;
}
