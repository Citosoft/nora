import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogContent } from "@/components/ui/dialog";
import type { AppInstallFrameProps } from "@/components/app/types/appsView.types";

/** Shared install layer with focus trapping, Escape and a title announced to assistive technology, headed by the app's name and where it comes from. */
export function AppInstallFrame({ title, source, open, busy = false, onClose, children }: AppInstallFrameProps) {
  const close = (): void => { if (!busy) onClose(); };
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!next) close(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/80 backdrop-blur-sm" />
      <Dialog.Content aria-describedby={undefined} onOpenAutoFocus={(event) => { event.preventDefault(); if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus(); }} className="fixed left-1/2 top-1/2 z-[30001] -translate-x-1/2 -translate-y-1/2 focus:outline-none">
        <DialogContent className="w-[min(32rem,calc(100vw-2rem))]">
          <header className="flex shrink-0 items-center gap-3 border-b border-border/70 py-3 pl-5 pr-3">
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <Dialog.Title className="truncate text-base font-semibold text-foreground">{title}</Dialog.Title>
              {source ? <span className="shrink-0 truncate text-xs text-muted-foreground">from {source}</span> : null}
            </div>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={close} disabled={busy} aria-label="Close dialog">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </header>
          {children}
        </DialogContent>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
