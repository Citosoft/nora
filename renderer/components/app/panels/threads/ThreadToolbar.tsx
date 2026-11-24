import { Archive, Plus, RefreshCw } from "lucide-react";
import type { ThreadToolbarProps } from "@/components/app/types/thread-workspace/toolbar.types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ThreadViewOptions } from "./ThreadViewOptions";

export function ThreadToolbar({ refresh, onBulkSettle, bulkSettleDisabled, canGroupByWorkspace, filter, sort, onSortChange, sourceFilter, onSourceFilterChange, grouping, onFilterChange, onGroupingChange, allWorkspaces, onScopeChange, onNew, newDisabled }: ThreadToolbarProps) {
  return <div className="flex shrink-0 items-center gap-1 px-3 pb-2 pt-1">
    <h2 className="min-w-0 flex-1 truncate pl-1 text-[10px] font-medium text-muted-foreground">Threads</h2>
    {allWorkspaces !== undefined && <Select value={allWorkspaces ? "all" : "workspace"} aria-label="Thread workspace scope"
      className="h-7 w-auto max-w-32 border-0 bg-transparent px-1 text-[10px] text-muted-foreground shadow-none" onChange={(event) => {
        if (event.target.value === "all") onScopeChange(true);
        else if (event.target.value === "workspace") onScopeChange(false);
      }}>
      <option value="workspace">This workspace</option><option value="all">All workspaces</option>
    </Select>}
    {onBulkSettle && <Button size="icon" variant="ghost" className="size-7 shrink-0 text-muted-foreground" aria-label="Settle threads" tooltip="Settle threads"
      disabled={bulkSettleDisabled} onClick={onBulkSettle}><Archive className="size-3.5" aria-hidden="true" /></Button>}
    <Button size="icon" variant="ghost" className="size-7 shrink-0 text-muted-foreground" aria-label="Refresh threads" tooltip="Refresh threads"
      disabled={refresh.disabled} onClick={refresh.onRefresh}>
      <RefreshCw className={`size-3.5 ${refresh.loading ? "animate-spin" : ""}`} aria-hidden="true" />
    </Button>
    <ThreadViewOptions sort={sort} onSortChange={onSortChange} sourceFilter={sourceFilter} onSourceFilterChange={onSourceFilterChange} canGroupByWorkspace={canGroupByWorkspace} filter={filter} grouping={grouping} onFilterChange={onFilterChange} onGroupingChange={onGroupingChange} />
    {onNew && <Button size="icon" variant="ghost" className="size-7 shrink-0" aria-label="New thread" disabled={newDisabled} onClick={onNew}>
      <Plus className="size-4" aria-hidden="true" />
    </Button>}
  </div>;
}
