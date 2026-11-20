import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LayoutGrid, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotTemplateCatalog } from "./BotTemplateCatalog";
import type { BotTemplateCatalogProps } from "@/components/app/types/botTemplates.types";

/** Keep browsing separate from creation, with enough room for the list and the full brief. */
export function BotTemplateDialog({ templates, templateRole, onUse }: BotTemplateCatalogProps) {
  const [open, setOpen] = useState(false);
  const creating = useRef(false);
  return <Dialog.Root open={open} onOpenChange={(next) => { if (next) creating.current = false; setOpen(next); }}>
    <Dialog.Trigger asChild><Button type="button" variant="outline" className="gap-1.5"><LayoutGrid className="size-4" aria-hidden="true" />Browse templates</Button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] flex h-[min(56rem,calc(100dvh-3rem))] w-[min(88rem,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-card p-4 shadow-panel outline-none sm:p-6"
        onCloseAutoFocus={(event) => { if (creating.current) event.preventDefault(); }}>
        <Dialog.Title className="sr-only">Browse bot templates</Dialog.Title>
        <Dialog.Description className="sr-only">Search and filter templates, inspect their responsibilities and recommended connectors, then choose one to create a bot.</Dialog.Description>
        <BotTemplateCatalog templates={templates} templateRole={templateRole} onUse={(template) => { creating.current = true; setOpen(false); onUse(template); }} />
        <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" className="absolute right-3 top-3 sm:right-5 sm:top-5" aria-label="Close template catalog"><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
