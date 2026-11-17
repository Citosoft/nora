import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ROUTINE_CALENDAR_STATUS_STYLES } from "@/components/app/constants/routineLabels";
import { entryTime } from "@/components/app/logic/routineCalendar";
import { RoutineCalendarEntryDetails } from "./RoutineCalendarEntryDetails";
import type { RoutineCalendarEntryChipProps } from "@/components/app/types/routineCalendar.types";

/** One run on the calendar: time, status dot, bot face and routine name; it opens the run's details. */
export function RoutineCalendarEntryChip({ item, detailed = false, ...actions }: RoutineCalendarEntryChipProps) {
  const { entry, routine: { routine, bot } } = item;
  const status = ROUTINE_CALENDAR_STATUS_STYLES[entry.status];
  const time = entryTime(entry.at);
  return <Popover>
    <PopoverTrigger asChild>
      <button type="button" aria-label={`${time} ${bot?.name ?? "Bot"}: ${routine.name}, ${status.label}`}
        className={cn("flex w-full min-w-0 items-center gap-1.5 rounded px-1.5 text-left text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          detailed ? "py-2" : "py-0.5", !routine.active && entry.status === "scheduled" && "opacity-60")}>
        <span className={cn("size-2 shrink-0 rounded-full", status.dot)} aria-hidden="true" />
        <span className="shrink-0 tabular-nums text-muted-foreground">{time}</span>
        {bot && <BotAvatar avatar={bot.avatar} size={detailed ? 20 : 14} />}
        <span className="min-w-0 truncate">{detailed && bot ? `${bot.name} · ` : ""}{routine.name}</span>
        {detailed && <span className="ml-auto shrink-0 text-muted-foreground">{status.label}</span>}
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-80" align="start">
      <RoutineCalendarEntryDetails item={item} {...actions} />
    </PopoverContent>
  </Popover>;
}
