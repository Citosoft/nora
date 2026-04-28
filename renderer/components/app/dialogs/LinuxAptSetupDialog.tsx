import type { LinuxAptSetupDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, TerminalSquare } from "lucide-react";

export function LinuxAptSetupDialog({
  open,
  status,
  isInstalling,
  errorMessage,
  onOpenChange,
  onEnable,
  onCopyManualCommands
}: LinuxAptSetupDialogProps) {
  if (!status) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle="Enable Linux updates"
        className="max-w-[640px]"
      >
        <DialogHeader>
          <DialogDescription>
            Nora can add the Citosoft APT repository now so future Linux updates can be discovered and installed with your package manager.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="rounded-[4px] border border-border/70 bg-background/60 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 text-primary" />
              <div className="space-y-1 text-sm text-foreground">
                <div className="font-medium">This setup will:</div>
                <div className="text-muted-foreground">Install the Citosoft signing key, add the Nora APT source, and refresh package indexes with `apt update`.</div>
              </div>
            </div>
          </div>

          {!status.pkexecAvailable ? (
            <div className="rounded-[4px] border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-foreground">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 text-amber-500" />
                <div className="space-y-1">
                  <div className="font-medium">Automatic setup is unavailable</div>
                  <div className="text-muted-foreground">
                    `pkexec` is not available on this system, so Nora cannot add the repository itself. Use the manual commands below instead.
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[4px] border border-destructive/25 bg-destructive/5 p-4 text-sm text-foreground">
              <div className="font-medium text-destructive">Setup failed</div>
              <div className="mt-1 text-muted-foreground">{errorMessage}</div>
            </div>
          ) : null}

          <div className="rounded-[4px] border border-border/70 bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <TerminalSquare className="size-4 text-primary" />
              <span>Manual setup commands</span>
            </div>
            <div className="mt-3 space-y-2">
              {status.manualCommands.map((command) => (
                <code
                  key={command}
                  className="block overflow-x-auto rounded-[4px] border border-border/70 bg-background px-3 py-2 text-xs text-foreground"
                >
                  {command}
                </code>
              ))}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onCopyManualCommands}>
            Copy manual commands
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button onClick={onEnable} disabled={isInstalling || !status.pkexecAvailable}>
            {isInstalling ? "Setting up..." : "Enable APT updates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
