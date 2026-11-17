import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NativeRequestStackProps } from "@/components/app/types/nativePanels.types";
import { NativeRequest } from "./NativeRequest";

export function NativeRequestStack({ requests, busy, visible, onRespond }: NativeRequestStackProps) {
  const content = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(null);
  const request = requests[0];
  const open = visible && request?.kind === "approval" && dismissedRequestId !== request.id;
  useEffect(() => {
    // Focus the dialog itself so repeated key presses cannot approve the next action.
    if (open) content.current?.focus({ preventScroll: true });
  }, [open, request?.id]);
  if (!request) return null;

  const count = `${requests.length} ${requests.length === 1 ? "request" : "requests"} pending`;
  if (request.kind === "question") return <div className="space-y-2" aria-label="Pending agent requests">
    {requests.length > 1 && <p role="status" className="text-xs text-muted-foreground">{count} · Respond one at a time</p>}
    <NativeRequest key={request.id} request={request} busy={busy} onRespond={(response) => onRespond(request.id, response)} />
  </div>;

  return <Dialog.Root open={open} onOpenChange={(nextOpen) => setDismissedRequestId(nextOpen ? null : request.id)}>
    <Dialog.Trigger asChild><Button ref={trigger} type="button" variant="outline" size="sm">
      <ShieldCheck className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />Review approval
      <span className="text-xs text-muted-foreground">· {count}</span>
    </Button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content ref={content} tabIndex={-1} className="fixed left-1/2 top-1/2 z-[30001] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 outline-none"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          previousFocus.current = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
          content.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          const target = trigger.current ?? previousFocus.current;
          if (target?.isConnected && !target.closest("[inert]")) {
            event.preventDefault(); target.focus({ preventScroll: true });
          }
        }}>
        <div className={cn("relative isolate", requests.length > 1 && "pt-3")}>
          {requests.length > 2 && <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 top-0 h-10 rounded-lg border bg-muted" />}
          {requests.length > 1 && <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1.5 h-10 rounded-lg border bg-card" />}
          <div className="relative flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-lg border bg-card shadow-panel">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
              <Dialog.Description asChild><p role="status" className="text-xs text-muted-foreground">{count}{requests.length > 1 && " · Respond one at a time"}</p></Dialog.Description>
              <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Review approval later"><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain">
              <NativeRequest key={request.id} request={request} busy={busy} presentation="dialog" onRespond={(response) => onRespond(request.id, response)} />
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
