import { useKeybindings } from "@/components/app/hooks/useKeybindings";
import { buildKeybindingHelpGroups } from "@/components/app/logic/keybindings/keybindingHelpRows";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { useMemo } from "react";

export type KeyboardShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const keybindings = useKeybindings();
  const groups = useMemo(() => buildKeybindingHelpGroups(keybindings), [keybindings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle="Keyboard Shortcuts"
        className="w-[min(960px,calc(100vw-3rem))] max-w-[min(960px,calc(100vw-3rem))]"
      >
        <DialogHeader>
          <DialogDescription>
            Use these shortcuts to move around the app without reaching for the mouse. Change them in Settings → Keybindings.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-6">
          {groups.map(({ category, rows }) => (
            <section key={category} className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">{category}</div>
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border/60 bg-border/50 sm:grid-cols-2">
                {rows.map((row) => (
                  <div key={row.key} className="flex min-w-0 items-start justify-between gap-3 bg-background px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{row.title}</div>
                      <div className="text-xs text-muted-foreground">{row.description}</div>
                    </div>
                    <div className="shrink-0 rounded-md border border-border/60 bg-muted/30 px-2 py-1 font-mono text-xs text-foreground">
                      {row.label}
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
