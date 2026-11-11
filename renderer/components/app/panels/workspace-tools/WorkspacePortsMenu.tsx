import { ExternalLink, Globe, MonitorPlay, TerminalSquare } from "lucide-react";
import { useLocalPorts } from "@/components/app/hooks/useLocalPorts";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useWorkspaceView } from "@/components/app/hooks/useWorkspaceView";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { WorkspacePortsMenuProps } from "@/components/app/types/workspaceToolSurfaces.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

export function WorkspacePortsMenu({ projectId, terminalId }: WorkspacePortsMenuProps) {
  const model = useLocalPorts();
  const { openTool } = useWorkspaceNavigation();
  const { updateView } = useWorkspaceView(projectId);
  const [open, setOpen] = useState(false);
  const ports = model?.ports.filter((port) => port.projectId === projectId && (!terminalId || port.terminalId === terminalId)) ?? [];
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" aria-label="Workspace development servers">
      <MonitorPlay className="size-3.5" aria-hidden="true" />Servers{ports.length > 0 && <span className="text-muted-foreground">{ports.length}</span>}
    </Button></PopoverTrigger>
    <PopoverContent align="end" className="w-80 space-y-2 p-3" aria-label="Workspace development servers">
      <p className="text-xs font-medium">Development servers</p>
      {!ports.length && <p className="text-xs text-muted-foreground">Run a development server in this workspace’s terminal to preview it here.</p>}
      {ports.map((port) => <div key={`${port.terminalId}:${port.port}`} className="flex items-center gap-2 rounded-md border border-border/60 p-2">
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{port.url}</p><p className="truncate text-[11px] text-muted-foreground">{port.terminalName}</p></div>
        <Button variant="ghost" size="icon" className="size-7" aria-label={`Preview ${port.url}`} onClick={() => {
          model?.openInAppBrowser(port); openTool(projectId, "browser"); setOpen(false);
        }}><Globe className="size-3.5" aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon" className="size-7" aria-label={`Open terminal ${port.terminalName}`} onClick={() => {
          updateView({ terminalId: port.terminalId }); model?.openTerminal(port); openTool(projectId, "terminals"); setOpen(false);
        }}><TerminalSquare className="size-3.5" aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon" className="size-7" aria-label={`Open ${port.url} externally`} onClick={() => { void noraSystemClient.openExternalUrl(port.url); }}><ExternalLink className="size-3.5" aria-hidden="true" /></Button>
      </div>)}
    </PopoverContent>
  </Popover>;
}
