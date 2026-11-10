import { GitBranch } from "lucide-react";
import type { WorkspaceStatusProps } from "@/components/app/types/workspaceUtilities.types";

export function WorkspaceStatusPanel({ entries, activeWorkspaceBranch, activeWorkspaceWorktreeName }: WorkspaceStatusProps) {
  const active = entries[entries.length - 1];
  return <div className="space-y-3" aria-label="Workspace status">
    <div className="flex items-center justify-between text-sm font-medium"><span>Workspace status</span><span className="text-xs text-muted-foreground">{active ? "Working" : "Idle"}</span></div>
    <div role="status" aria-live="polite" className="space-y-2 text-xs text-muted-foreground">{entries.length ? entries.map((entry) => <p key={entry.id}>{entry.message}</p>) : <p>Ready</p>}</div>
    {(activeWorkspaceBranch || activeWorkspaceWorktreeName) && <div className="flex items-start gap-2 border-t pt-3 text-xs"><GitBranch className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0 space-y-1">{activeWorkspaceBranch && <p className="break-all">{activeWorkspaceBranch}</p>}{activeWorkspaceWorktreeName && <p className="break-all text-muted-foreground">{activeWorkspaceWorktreeName}</p>}</div></div>}
  </div>;
}
