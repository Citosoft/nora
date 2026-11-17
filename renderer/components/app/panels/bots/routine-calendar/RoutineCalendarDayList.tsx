import { RoutineCalendarEntryChip } from "./RoutineCalendarEntryChip";
import type { RoutineCalendarDayListProps } from "@/components/app/types/routineCalendar.types";

/** Everything on one day in time order, with the bot and status spelled out. */
export function RoutineCalendarDayList({ items, ...actions }: RoutineCalendarDayListProps) {
  if (!items.length) return <p className="px-6 py-10 text-center text-sm text-muted-foreground">No routines run on this day.</p>;
  return <ul className="mx-auto w-full max-w-3xl divide-y px-4 py-3">
    {items.map((item) => <li key={item.entry.id}><RoutineCalendarEntryChip item={item} detailed {...actions} /></li>)}
  </ul>;
}
