import { Button } from "@/components/ui/button";
import { useWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import type { WorkspaceUtilitiesProps, WorkspaceUtilitiesViewProps } from "@/components/app/types/workspaceUtilities.types";
import { AppTools } from "./workspace-utilities/AppTools";
import { ModelUsage } from "./workspace-utilities/ModelUsage";
import { WorkspaceTools } from "./workspace-utilities/WorkspaceTools";
import { LoaderCircle, TerminalSquare } from "lucide-react";

export function WorkspaceUtilities({ collapsed }: WorkspaceUtilitiesProps) {
  const { utilities } = useWorkspaceSidebarPorts();
  return <WorkspaceUtilitiesView {...utilities} collapsed={collapsed} />;
}

export function WorkspaceUtilitiesView({ collapsed, status, appTools, terminal }: WorkspaceUtilitiesViewProps) {
  const active = status.entries[status.entries.length - 1];
  return <section aria-label="Workspace utilities" className={`shrink-0 space-y-1 ${collapsed ? "px-1 py-2" : "p-2"}`}>
    {!collapsed && active && <div role="status" aria-live="polite" className="flex min-w-0 items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground">{active.loading && <LoaderCircle className="size-3 shrink-0 motion-safe:animate-spin" aria-hidden="true" />}<span className="truncate" title={active.message}>{active.message}</span></div>}
    <div className={`flex ${collapsed ? "flex-col items-center" : "items-center"} gap-1`}>
      <ModelUsage collapsed={collapsed} tools={status.tools} onInstallTool={status.onInstallTool} onSwitchToolAccount={status.onSwitchToolAccount} />
      <WorkspaceTools collapsed={collapsed} status={status} />
      <Button variant="ghost" size="icon" aria-label={terminal.isOpen ? "Close local terminal" : "Open local terminal"} aria-expanded={terminal.isOpen} aria-controls="local-terminal-dock" tooltip="Local terminal" onClick={terminal.onToggle} className={`size-8 ${terminal.isOpen ? "bg-accent text-foreground" : "text-muted-foreground"}`}><TerminalSquare className="size-4" aria-hidden="true" /></Button>
      <AppTools {...appTools} collapsed={collapsed} />
    </div>
  </section>;
}
