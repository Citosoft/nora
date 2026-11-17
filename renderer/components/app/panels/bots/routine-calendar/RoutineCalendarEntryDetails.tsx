import { ExternalLink, Pause, Pencil, Play, Zap } from "lucide-react";
import { describeRoutineSchedule, formatRoutineInstant } from "@shared/bots/routines/describe";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import { ROUTINE_CALENDAR_STATUS_STYLES } from "@/components/app/constants/routineLabels";
import type { RoutineCalendarEntry } from "@shared/types/bots/routines.types";
import type { RoutineCalendarEntryChipProps } from "@/components/app/types/routineCalendar.types";

function note(entry: RoutineCalendarEntry): string | null {
  const missed = entry.run?.missed;
  if (missed) return missed.count > 1 ? `${missed.count} runs were missed while Nora was closed.` : "Missed while Nora was closed.";
  if (entry.truncated) return "This routine runs more often than the calendar lists; later runs in this range are not shown.";
  return entry.run?.error ?? null;
}

/** The popover body for one calendar entry: who runs what and when, how it went, and what you can do about it. */
export function RoutineCalendarEntryDetails({ item, openerFor, onEdit, onRunNow, onToggle, busy }: Omit<RoutineCalendarEntryChipProps, "detailed">) {
  const { entry, routine: { routine, bot } } = item;
  const status = ROUTINE_CALENDAR_STATUS_STYLES[entry.status];
  const open = entry.run?.conversationId ? openerFor(entry.run.conversationId) : null;
  const detail = note(entry);
  return <div className="space-y-3">
    <div className="flex items-start gap-2.5">
      {bot && <BotAvatar avatar={bot.avatar} size={32} />}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{routine.name}</p>
        <p className="truncate text-xs text-muted-foreground">{bot?.name ?? "A bot that is no longer available"} · {describeRoutineSchedule(routine.schedule)}</p>
      </div>
    </div>
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
      <dt className="text-muted-foreground">{entry.status === "scheduled" ? "Runs" : "Due"}</dt><dd>{formatRoutineInstant(entry.at, routine.timezone)}</dd>
      <dt className="text-muted-foreground">Status</dt>
      <dd className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${status.dot}`} aria-hidden="true" />{status.label}{entry.run?.kind === "manual" ? " (run now)" : ""}</dd>
    </dl>
    {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    {!routine.active && <p className="text-xs text-muted-foreground">This routine is paused.</p>}
    <div className="flex flex-wrap gap-1.5">
      {open && <Button type="button" size="sm" className="gap-1.5" onClick={open}><ExternalLink className="size-3.5" aria-hidden="true" />Open thread</Button>}
      {bot && <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => onEdit(routine)}><Pencil className="size-3.5" aria-hidden="true" />Edit</Button>}
      <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => onRunNow(routine)}><Zap className="size-3.5" aria-hidden="true" />Run now</Button>
      <Button type="button" size="sm" variant="ghost" className="gap-1.5" disabled={busy} onClick={() => onToggle(routine)}>
        {routine.active ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}{routine.active ? "Pause" : "Resume"}</Button>
    </div>
  </div>;
}
