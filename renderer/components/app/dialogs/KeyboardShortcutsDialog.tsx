import {
  SHORTCUT_DEFINITIONS,
  buildShortcutsForHelpDialog,
  formatShortcutKeys
} from "@/components/app/logic/keyboardShortcuts";
import type { WindowUiState } from "@/components/app/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";

export type KeyboardShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: WindowUiState["platform"];
};

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  platform
}: KeyboardShortcutsDialogProps) {
  const helpShortcuts = buildShortcutsForHelpDialog(SHORTCUT_DEFINITIONS, platform);
  const groupedShortcuts = helpShortcuts.reduce<Record<string, typeof helpShortcuts>>((acc, shortcut) => {
    const group = acc[shortcut.category] ?? [];
    group.push(shortcut);
    acc[shortcut.category] = group;
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle="Keyboard Shortcuts"
        className="w-[min(960px,calc(100vw-3rem))] max-w-[min(960px,calc(100vw-3rem))]"
      >
        <DialogHeader>
          <DialogDescription>Use these shortcuts to move around the app without reaching for the mouse.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <section key={category} className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{category}</div>
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-border/60 bg-border/50 sm:grid-cols-2">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex min-w-0 items-start justify-between gap-3 bg-background/30 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{shortcut.title}</div>
                      <div className="text-xs text-muted-foreground">{shortcut.description}</div>
                    </div>
                    <div className="shrink-0 rounded-[4px] border border-border/60 bg-muted/30 px-2 py-1 font-mono text-xs text-foreground">
                      {shortcut.helpKeysLabel ?? formatShortcutKeys(shortcut.keys, platform)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
