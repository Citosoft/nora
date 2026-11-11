import { Circle, GitBranch, LoaderCircle } from "lucide-react";
import { useWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import type { WorkspaceToolProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function WorkspaceStatusIndicator({ workspace }: WorkspaceToolProps) {
  const { utilities: { status }, onOpenConnectionsSettings } = useWorkspaceSidebarPorts();
  const active = status.entries.at(-1);
  const remote = workspace.project.location?.kind === "ssh" ? workspace.project.location : null;
  return <Popover>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground" aria-label="Workspace status" tooltip={active?.message ?? (remote ? `SSH · ${remote.host}` : "Workspace ready")}>
      {active?.loading ? <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" /> : <Circle className="size-2 fill-emerald-500 text-emerald-500" aria-hidden="true" />}
    </Button></PopoverTrigger>
    <PopoverContent align="start" className="w-72 space-y-3 p-3" aria-label={`Status for ${workspace.project.name}`}>
      <p className="text-xs font-medium">{workspace.project.name}</p>
      <p className="break-all text-xs text-muted-foreground">{workspace.project.rootPath}</p>
      {status.activeWorkspaceBranch && <p className="flex items-center gap-2 text-xs"><GitBranch className="size-3.5 shrink-0" aria-hidden="true" />{status.activeWorkspaceBranch}</p>}
      {status.activeWorkspaceWorktreeName && <p className="text-xs text-muted-foreground">Checkout: {status.activeWorkspaceWorktreeName}</p>}
      <div role="status" aria-live="polite" className="space-y-1 text-xs text-muted-foreground">{status.entries.length ? status.entries.map((entry) => <p key={entry.id}>{entry.message}</p>) : <p>Ready</p>}</div>
      <div className="border-t pt-2"><p className="mb-2 text-xs text-muted-foreground">{remote ? `SSH · ${remote.user}@${remote.host}` : "Local workspace"}</p><Button size="sm" variant="ghost" className="h-7 px-1 text-xs" onClick={onOpenConnectionsSettings}>Connection settings</Button></div>
    </PopoverContent>
  </Popover>;
}
