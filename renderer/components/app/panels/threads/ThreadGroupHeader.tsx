import { AppMark } from "@/components/app/shared/AppMark";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { WorkspaceAvatar } from "@/components/app/shared/WorkspaceAvatar";
import type { ThreadGroupHeaderProps } from "@/components/app/types/thread-workspace/navigation.types";

export function ThreadGroupHeader({ group }: ThreadGroupHeaderProps) {
  if (!group.label) return null;
  return <h3 className="flex min-w-0 items-center gap-2 px-2 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">
    {group.id === "nora" && <AppMark className="size-4 shrink-0" />}
    {group.providerKind && <AgentToolIcon toolId={group.providerKind} label={group.label} className="size-4 shrink-0" imageClassName="size-3.5" />}
    {group.workspace && <WorkspaceAvatar workspace={group.workspace} size="small" />}
    <span className="min-w-0 flex-1 truncate" title={group.label}>{group.label}</span><span className="text-[10px] tabular-nums">{group.rows.length}</span>
  </h3>;
}
