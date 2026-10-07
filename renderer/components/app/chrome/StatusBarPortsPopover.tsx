import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useStatusBarLocalPorts } from "@/components/app/hooks/useStatusBarLocalPorts";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink, Globe, MonitorPlay } from "lucide-react";
import { useState } from "react";

/** Footer trigger listing local dev-server ports detected across open workspaces. */
export function StatusBarPortsPopover() {
  const model = useStatusBarLocalPorts();
  const [open, setOpen] = useState(false);

  if (!model) {
    return null;
  }

  const { ports, openTerminal, openInAppBrowser } = model;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Ports"
          className="flex items-center gap-1 rounded-[4px] bg-transparent px-1 py-0.5 transition hover:bg-accent/50"
          aria-label={`Open active ports (${ports.length})`}
        >
          <MonitorPlay className="size-4 text-muted-foreground" />
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{ports.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 space-y-3">
        <div>
          <div className="text-sm font-medium text-foreground">Ports</div>
          <div className="text-xs text-muted-foreground">{ports.length} active</div>
        </div>
        {ports.length ? (
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {ports.map((port) => (
              <div
                key={`${port.terminalId}:${port.port}`}
                className="flex items-center gap-2 rounded-[6px] border border-border/60 bg-background/50 px-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    openTerminal(port);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  title={`Focus ${port.terminalName}`}
                >
                  <span className="shrink-0 rounded-[4px] border border-border/60 bg-background/60 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                    :{port.port}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{port.terminalName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{port.projectName}</span>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  tooltip="Open in app browser"
                  aria-label={`Open ${port.url} in app browser`}
                  onClick={() => {
                    openInAppBrowser(port);
                    setOpen(false);
                  }}
                >
                  <Globe className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  tooltip="Open externally"
                  aria-label={`Open ${port.url} externally`}
                  onClick={() => {
                    void noraSystemClient.openExternalUrl(port.url);
                  }}
                >
                  <ExternalLink className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[6px] border border-border/60 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
            No active local ports.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
