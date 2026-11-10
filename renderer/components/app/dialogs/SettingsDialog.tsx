import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { SettingsPage } from "@/components/app/panels/SettingsPage";
import type { SettingsDialogProps } from "@/components/app/types/settingsDialog.types";
import { Button } from "@/components/ui/button";

export function SettingsDialog({ open, initialGroup }: SettingsDialogProps) {
  const { closeSettingsPage } = useSettingsRuntime();
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!next) closeSettingsPage(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[8999] bg-black/60 backdrop-blur-sm" />
      {/* Shared popovers and global error dialogs must remain above this modal. */}
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[9000] flex h-[min(84vh,850px)] w-[min(1100px,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-panel focus:outline-none"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.querySelector<HTMLButtonElement>('[aria-label="Workspace utilities"] button[aria-label="Open app menu"]')?.focus();
        }}>
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-3">
          <Dialog.Title className="text-base font-medium">Settings</Dialog.Title>
          <Dialog.Description className="sr-only">Configure Nora's appearance, tools, and workspace preferences.</Dialog.Description>
          <Dialog.Close asChild><Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Close settings"><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden"><SettingsPage initialGroup={initialGroup} /></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
