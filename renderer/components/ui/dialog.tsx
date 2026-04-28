import { Button } from "@/components/ui/button";
import type { DialogProps } from "@/components/ui/types/primitives.types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
  );
}

export function DialogContent({
  className,
  children,
  onClose,
  headerTitle
}: PropsWithChildren<{ className?: string; onClose?: () => void; headerTitle?: ReactNode }>) {
  return (
    <div
      className={cn(
        "flex max-h-[calc(100vh-3rem)] w-[min(720px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[5px] border border-border bg-card shadow-panel",
        className
      )}
    >
      {onClose || headerTitle ? (
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0 truncate text-lg font-semibold text-foreground">
            {headerTitle || null}
          </div>
          {onClose ? (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
              <X className="size-4" />
            </Button>
          ) : <div className="size-9 shrink-0" aria-hidden="true" />}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function DialogHeader({ children }: PropsWithChildren) {
  return <div className="space-y-2 px-6 pb-5 pt-6">{children}</div>;
}

export function DialogBody({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 pb-5 pt-1", className)}>{children}</div>;
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-semibold">{children}</h2>;
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function DialogFooter({ children }: PropsWithChildren) {
  return <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/45 px-6 py-4">{children}</div>;
}
