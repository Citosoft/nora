import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RoutineCalendarToolbarProps, RoutineCalendarView } from "@/components/app/types/routineCalendar.types";

const VIEWS: readonly { id: RoutineCalendarView; label: string }[] = [{ id: "month", label: "Month" }, { id: "week", label: "Week" }, { id: "day", label: "Day" }];

/** Moves through time and switches between month, week and day. */
export function RoutineCalendarToolbar({ title, view, onViewChange, onMove, onToday }: RoutineCalendarToolbarProps) {
  const unit = view === "month" ? "month" : view === "week" ? "week" : "day";
  return <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
    <Button type="button" variant="outline" size="sm" onClick={onToday}>Today</Button>
    <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Previous ${unit}`} onClick={() => onMove(-1)}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
    <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Next ${unit}`} onClick={() => onMove(1)}><ChevronRight className="size-4" aria-hidden="true" /></Button>
    <h2 className="text-sm font-semibold" aria-live="polite">{title}</h2>
    <div role="radiogroup" aria-label="Calendar view" className="ml-auto flex rounded-md border p-0.5">
      {VIEWS.map((entry) => <button key={entry.id} type="button" role="radio" aria-checked={view === entry.id} onClick={() => onViewChange(entry.id)}
        className={cn("rounded px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          view === entry.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}>{entry.label}</button>)}
    </div>
  </div>;
}
