import { ChevronDown, ChevronRight } from "lucide-react";
import { AppMark } from "@/components/app/shared/AppMark";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { WorkspaceAvatar } from "@/components/app/shared/WorkspaceAvatar";
import type { ThreadGroupHeaderProps } from "@/components/app/types/thread-workspace/navigation.types";

export function ThreadGroupHeader({ group, collapsed, onToggle }: ThreadGroupHeaderProps) {
  if (!group.label) return null;
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  return <h3 className="mb-1 border-b border-dotted border-border pb-1 pt-2 text-[11px] font-medium text-muted-foreground">
    <button type="button" aria-expanded={!collapsed} onClick={onToggle}
      className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-0.5 text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Chevron className="-ml-1 size-3.5 shrink-0" aria-hidden="true" />
      {group.id === "nora" && <AppMark className="size-4 shrink-0" />}
      {group.providerKind && <AgentToolIcon connection={group.providerConnection} toolId={group.providerKind} label={group.label} className="size-4 shrink-0" imageClassName="size-3.5" />}
      {group.workspace && <WorkspaceAvatar workspace={group.workspace} size="small" />}
      <span className="min-w-0 flex-1 truncate" title={group.label}>{group.label}</span><span className="text-[10px] tabular-nums">{group.rows.length}</span>
    </button>
  </h3>;
}
