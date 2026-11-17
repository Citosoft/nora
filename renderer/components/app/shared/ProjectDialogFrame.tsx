import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectDialogFrameProps } from "@/components/app/types/projectDialog.types";

export function ProjectDialogFrame({
  open,
  onOpenChange,
  title,
  description,
  busy = false,
  wide = false,
  children,
}: ProjectDialogFrameProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[30001] flex max-h-[calc(100dvh-3rem)] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-panel outline-none",
            wide && "h-[min(84dvh,760px)] w-[min(900px,calc(100vw-2rem))]",
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-5">
            <div>
              <Dialog.Title className="text-base font-semibold">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs leading-5 text-muted-foreground">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-mr-1 -mt-1 size-8"
                aria-label={`Close ${title.toLowerCase()} dialog`}
                disabled={busy}
              >
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
