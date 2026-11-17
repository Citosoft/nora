import { cn } from "@/lib/utils";
import { dayLabel, dayOfMonth, sameMonth, weekdayLabel } from "@/components/app/logic/routineCalendar";
import { RoutineCalendarEntryChip } from "./RoutineCalendarEntryChip";
import type { RoutineCalendarGridProps } from "@/components/app/types/routineCalendar.types";

/** Entries a day cell lists before "+N more", which opens the day view. */
const CELL_LIMIT = { week: 10, month: 3 } as const;

/** The month grid (whole weeks) or one week of tall day columns; each cell lists its runs in time order. */
export function RoutineCalendarGrid({ days, byDay, today, month, onShowDay, ...actions }: RoutineCalendarGridProps) {
  const limit = month ? CELL_LIMIT.month : CELL_LIMIT.week;
  const rows = days.length / 7;
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
      {days.slice(0, 7).map((day) => <div key={day} className="px-2 py-1.5">{weekdayLabel(day)}</div>)}
    </div>
    <div className="-mb-px grid min-h-0 flex-1 grid-cols-7 [&>*:nth-child(7n)]:border-r-0" style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
      {days.map((day) => {
        const items = byDay.get(day) ?? [];
        const outside = month !== null && !sameMonth(day, month);
        return <section key={day} aria-label={dayLabel(day)}
          className={cn("flex min-h-[5.5rem] min-w-0 flex-col gap-0.5 border-b border-r p-1", outside && "bg-muted/30")}>
          <button type="button" onClick={() => onShowDay(day)} aria-label={`Show ${dayLabel(day)}`}
            className={cn("ml-0.5 grid size-6 place-items-center rounded-full text-xs tabular-nums hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              day === today ? "bg-primary font-semibold text-primary-foreground hover:bg-primary/90" : outside ? "text-muted-foreground/70" : "text-foreground")}>
            {dayOfMonth(day)}</button>
          <div className="min-h-0 flex-1 space-y-px overflow-hidden">
            {items.slice(0, limit).map((item) => <RoutineCalendarEntryChip key={item.entry.id} item={item} {...actions} />)}
          </div>
          {items.length > limit && <button type="button" onClick={() => onShowDay(day)}
            className="rounded px-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            +{items.length - limit} more</button>}
        </section>;
      })}
    </div>
  </div>;
}
