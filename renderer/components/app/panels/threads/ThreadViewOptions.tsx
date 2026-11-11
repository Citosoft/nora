import { ThreadSortSelect } from "./ThreadSortSelect";
import { threadSortOptions } from "@/components/app/logic/thread-workspace/sorting";
import { threadFilterIcons, threadGroupingIcons } from "@/components/app/constants/threadViewIcons";
import { ThreadViewOptionLabel } from "./ThreadViewOptionLabel";
import { AppMark } from "@/components/app/shared/AppMark";
import { threadSourceOptions, threadSourceFilterSchema } from "@/components/app/logic/thread-workspace/sources";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { AppWindow, MessagesSquare, SlidersHorizontal } from "lucide-react";
import { availableThreadGroupings } from "@/components/app/logic/thread-workspace/groups";
import type { ThreadFilterOption, ThreadViewOptionsProps } from "@/components/app/types/thread-workspace/toolbar.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";

const filters: readonly ThreadFilterOption[] = [
  { id: "all", label: "Recent" },
  { id: "active", label: "Active" },
  { id: "attention", label: "Needs attention" },
  { id: "settled", label: "Settled" }
];

export function ThreadViewOptions({ canGroupByWorkspace, filter, sort, onSortChange, sourceFilter, onSourceFilterChange, grouping, onFilterChange, onGroupingChange }: ThreadViewOptionsProps) {
  const groupingOptions = availableThreadGroupings(canGroupByWorkspace);
  const active = filter !== "all" || grouping !== "none" || sourceFilter !== "all" || sort !== "recent";
  const filterLabel = filters.find((entry) => entry.id === filter)?.label ?? "Recent";
  const groupingLabel = groupingOptions.find((entry) => entry.id === grouping)?.label ?? "No grouping";
  const sourceLabel = threadSourceOptions.find((entry) => entry.id === sourceFilter)?.label ?? "All chats";
  const sortLabel = threadSortOptions.find((entry) => entry.id === sort)?.label ?? "Recent activity";
  const summary = `${filterLabel} · ${sourceLabel} · ${sortLabel} · ${grouping === "none" ? groupingLabel : `Group by ${groupingLabel.toLocaleLowerCase()}`}`;
  return <Popover>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative size-7 shrink-0 text-muted-foreground"
      aria-label="Thread view options" aria-description={summary} tooltip={`Thread view options\n${summary}`}>
      <SlidersHorizontal className="size-3.5" aria-hidden="true" />
      {active && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" aria-hidden="true" />}
    </Button></PopoverTrigger>
    <PopoverContent align="end" className="w-64 p-3" aria-label="Thread view options">
      <h3 className="mb-3 text-xs font-medium">View options</h3>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
        <span className="text-xs text-muted-foreground">Show</span>
        <Select value={filter} aria-label="Filter threads" className="h-8 px-2 text-xs" onChange={(event) => {
          const entry = filters.find((candidate) => candidate.id === event.target.value);
          if (entry) onFilterChange(entry.id);
        }}>{filters.map((entry) => {
          const Icon = threadFilterIcons[entry.id];
          return <option key={entry.id} value={entry.id}><ThreadViewOptionLabel label={entry.label}
            icon={<Icon className={`size-3.5 ${entry.id === "settled" ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`} />} /></option>;
        })}</Select>
        <span className="text-xs text-muted-foreground">Source</span>
        <Select value={sourceFilter} aria-label="Filter thread source" className="h-8 px-2 text-xs" onChange={(event) => {
          const value = threadSourceFilterSchema.safeParse(event.target.value);
          if (value.success) onSourceFilterChange(value.data);
        }}>{threadSourceOptions.map((entry) => {
          const Icon = entry.id === "external" ? AppWindow : MessagesSquare;
          const icon = entry.id === "nora" ? <AppMark className="size-4 shrink-0" />
            : entry.providerKind ? <AgentToolIcon toolId={entry.providerKind} label={entry.label} className="size-4 shrink-0" imageClassName="size-3.5" />
              : <Icon className="size-3.5 text-muted-foreground" />;
          return <option key={entry.id} value={entry.id}><ThreadViewOptionLabel icon={icon} label={entry.label} /></option>;
        })}</Select>
        <span className="text-xs text-muted-foreground">Group by</span>
        <Select value={grouping} aria-label="Group threads by" className="h-8 px-2 text-xs" onChange={(event) => {
          const entry = groupingOptions.find((candidate) => candidate.id === event.target.value);
          if (entry) onGroupingChange(entry.id);
        }}>{groupingOptions.map((entry) => {
          const Icon = threadGroupingIcons[entry.id];
          return <option key={entry.id} value={entry.id}><ThreadViewOptionLabel label={entry.label} icon={<Icon className="size-3.5 text-muted-foreground" />} /></option>;
        })}</Select>
        <span className="text-xs text-muted-foreground">Sort by</span>
        <ThreadSortSelect sort={sort} onSortChange={onSortChange} />
      </div>
      <div className="mt-3 border-t border-border/60 pt-2">
        <Button variant="ghost" className="h-7 w-full justify-start px-1 text-xs text-muted-foreground" disabled={!active}
          onClick={() => { onFilterChange("all"); onGroupingChange("none"); onSourceFilterChange("all"); onSortChange("recent"); }}>Reset view</Button>
      </div>
    </PopoverContent>
  </Popover>;
}
