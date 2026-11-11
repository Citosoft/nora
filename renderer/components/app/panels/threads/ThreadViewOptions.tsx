import { SlidersHorizontal } from "lucide-react";
import { threadGroupingOptions } from "@/components/app/logic/thread-workspace/groups";
import type { ThreadFilterOption, ThreadViewOptionsProps } from "@/components/app/types/thread-workspace/toolbar.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";

const filters: readonly ThreadFilterOption[] = [
  { id: "all", label: "Recent" },
  { id: "active", label: "Active" },
  { id: "attention", label: "Needs attention" },
  { id: "archive", label: "Archived" }
];

export function ThreadViewOptions({ filter, grouping, onFilterChange, onGroupingChange }: ThreadViewOptionsProps) {
  const active = filter !== "all" || grouping !== "none";
  const filterLabel = filters.find((entry) => entry.id === filter)?.label ?? "Recent";
  const groupingLabel = threadGroupingOptions.find((entry) => entry.id === grouping)?.label ?? "No grouping";
  const summary = `${filterLabel} · ${grouping === "none" ? groupingLabel : `Group by ${groupingLabel.toLocaleLowerCase()}`}`;
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
        }}>{filters.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</Select>
        <span className="text-xs text-muted-foreground">Group by</span>
        <Select value={grouping} aria-label="Group threads by" className="h-8 px-2 text-xs" onChange={(event) => {
          const entry = threadGroupingOptions.find((candidate) => candidate.id === event.target.value);
          if (entry) onGroupingChange(entry.id);
        }}>{threadGroupingOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</Select>
      </div>
      <div className="mt-3 border-t border-border/60 pt-2">
        <Button variant="ghost" className="h-7 w-full justify-start px-1 text-xs text-muted-foreground" disabled={!active}
          onClick={() => { onFilterChange("all"); onGroupingChange("none"); }}>Reset view</Button>
      </div>
    </PopoverContent>
  </Popover>;
}
