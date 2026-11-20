import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plug } from "lucide-react";
import type { ConnectorGalleryEntry } from "@shared/types/connectors/gallery.types";
import type { ConnectorGalleryDialogProps } from "@/components/app/types/noraConnectors.types";
import { DialogBody, DialogContent } from "@/components/ui/dialog";
import { AddConnectorDialog } from "./AddConnectorDialog";
import { ConnectorGalleryGrid } from "./ConnectorGalleryGrid";

type Picked = { kind: "preset"; entry: ConnectorGalleryEntry } | { kind: "custom" } | null;

/** Adding a connector starts here: pick a work tool's official server (or any other), then the add dialog takes over. */
export function ConnectorGalleryDialog({ open, onOpenChange, onCreate, accessChoices, addedUrls }: ConnectorGalleryDialogProps) {
  const [picked, setPicked] = useState<Picked>(null);
  useEffect(() => { if (!open) setPicked(null); }, [open]);
  const adding = picked !== null;
  // The gallery closes while the add dialog is up; closing that without adding ends the whole flow.
  const closeAdd = (next: boolean) => { if (!next) { setPicked(null); onOpenChange(false); } };
  return <>
    <Dialog.Root open={open && !adding} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] -translate-x-1/2 -translate-y-1/2 focus:outline-none">
          <DialogContent className="w-[min(52rem,calc(100vw-2rem))]" onClose={() => onOpenChange(false)}
            headerTitle={<Dialog.Title className="flex items-center gap-2"><Plug className="size-4 text-primary" />Add connector</Dialog.Title>}>
            <Dialog.Description className="px-5 text-sm text-muted-foreground">Connect a work tool through its official MCP server. Nora signs in with your account and keeps the credentials.</Dialog.Description>
            <DialogBody className="thin-scrollbar max-h-[60vh] overflow-y-auto px-5 py-4">
              <ConnectorGalleryGrid addedUrls={addedUrls} onPick={(entry) => setPicked({ kind: "preset", entry })} onCustom={() => setPicked({ kind: "custom" })} />
            </DialogBody>
          </DialogContent>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <AddConnectorDialog open={adding} onOpenChange={closeAdd} onCreate={onCreate} accessChoices={accessChoices} preset={picked?.kind === "preset" ? picked.entry : null} />
  </>;
}
