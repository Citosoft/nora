import { RefreshCcw, Search } from "lucide-react";
import { OUTPUT_KINDS } from "@/components/app/constants/outputKinds";
import type { LibraryGrouping, LibraryToolbarProps } from "@/components/app/types/library.types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const GROUPINGS: readonly { value: LibraryGrouping; label: string }[] = [
  { value: "date", label: "Date" }, { value: "thread", label: "Thread" }, { value: "type", label: "Type" }
];

function isGrouping(value: string): value is LibraryGrouping {
  return GROUPINGS.some((grouping) => grouping.value === value);
}

/** Search, type, thread and grouping controls for the Library. */
export function LibraryToolbar({ filter, grouping, threads, counts, loading, onFilterChange, onGroupingChange, onRefresh }: LibraryToolbarProps) {
  const total = Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);
  const chip = (active: boolean) => cn("inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/70 text-muted-foreground hover:text-foreground");
  return <div className="shrink-0 space-y-3 border-b border-border/60 px-5 pb-3 pt-4">
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="mr-auto text-base font-semibold">Library<span className="ml-2 text-sm font-normal tabular-nums text-muted-foreground">{total}</span></h2>
      <div className="relative w-full min-w-0 sm:w-72">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input aria-label="Search outputs" placeholder="Search outputs…" className="h-8 pl-8 text-xs" value={filter.query} onChange={(event) => onFilterChange({ query: event.target.value })} />
      </div>
      <Select aria-label="Filter by thread" className="h-8 w-48 text-xs" value={filter.conversationId ?? ""} onChange={(event) => onFilterChange({ conversationId: event.target.value || null })}>
        <option value="">All threads</option>
        {threads.map((thread) => <option key={thread.conversationId} value={thread.conversationId}>{thread.title} ({thread.count})</option>)}
      </Select>
      <Select aria-label="Group by" className="h-8 w-40 text-xs" value={grouping} onChange={(event) => { if (isGrouping(event.target.value)) onGroupingChange(event.target.value); }}>
        {GROUPINGS.map(({ value, label }) => <option key={value} value={value}>Group by {label.toLocaleLowerCase()}</option>)}
      </Select>
      <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Refresh the Library" tooltip="Refresh" disabled={loading} onClick={onRefresh}>
        <RefreshCcw className={cn("size-3.5", loading && "motion-safe:animate-spin")} aria-hidden="true" />
      </Button>
    </div>
    <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Filter by type">
      <button type="button" className={chip(filter.kind === "all")} aria-pressed={filter.kind === "all"} onClick={() => onFilterChange({ kind: "all" })}>
        All<span className="tabular-nums text-muted-foreground">{total}</span></button>
      {OUTPUT_KINDS.filter(({ kind }) => counts[kind] || filter.kind === kind).map(({ kind, plural }) =>
        <button key={kind} type="button" className={chip(filter.kind === kind)} aria-pressed={filter.kind === kind} onClick={() => onFilterChange({ kind })}>
          {plural}<span className="tabular-nums text-muted-foreground">{counts[kind] ?? 0}</span></button>)}
    </div>
  </div>;
}
