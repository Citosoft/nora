import { Plus } from "lucide-react";
import type { ThreadToolbarProps } from "@/components/app/types/thread-workspace/toolbar.types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ThreadViewOptions } from "./ThreadViewOptions";

export function ThreadToolbar({ filter, grouping, onFilterChange, onGroupingChange, allWorkspaces, onScopeChange, onNew, newDisabled }: ThreadToolbarProps) {
  return <div className="flex shrink-0 items-center gap-1 px-3 pb-2 pt-1">
    <h2 className="min-w-0 flex-1 truncate pl-1 text-[11px] font-medium text-muted-foreground">Threads</h2>
    {allWorkspaces !== undefined && <Select value={allWorkspaces ? "all" : "workspace"} aria-label="Thread workspace scope"
      className="h-7 w-auto max-w-32 border-0 bg-transparent px-1 text-[11px] text-muted-foreground shadow-none" onChange={(event) => {
        if (event.target.value === "all") onScopeChange(true);
        else if (event.target.value === "workspace") onScopeChange(false);
      }}>
      <option value="workspace">This workspace</option><option value="all">All workspaces</option>
    </Select>}
    <ThreadViewOptions filter={filter} grouping={grouping} onFilterChange={onFilterChange} onGroupingChange={onGroupingChange} />
    {onNew && <Button size="icon" variant="ghost" className="size-7 shrink-0" aria-label="New thread" disabled={newDisabled} onClick={onNew}>
      <Plus className="size-4" aria-hidden="true" />
    </Button>}
  </div>;
}
