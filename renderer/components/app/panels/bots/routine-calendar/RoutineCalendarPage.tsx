import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { findEffectiveBot } from "@shared/bots/catalog";
import { useRoutineCalendar } from "@/components/app/hooks/useRoutineCalendar";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { calendarDayOf, calendarSpan, calendarTitle, entriesByDay, moveCalendarAnchor } from "@/components/app/logic/routineCalendar";
import { BotsHomeTabs } from "@/components/app/panels/bots/BotsHomeTabs";
import { BOTS_HOME_COLUMN_CLASS, BOTS_HOME_SCROLL_CLASS } from "@/components/app/constants/botsHomeLayout";
import { cn } from "@/lib/utils";
import { CalendarRoutineEditor } from "./CalendarRoutineEditor";
import { RoutineCalendarDayList } from "./RoutineCalendarDayList";
import { RoutineCalendarGrid } from "./RoutineCalendarGrid";
import { RoutineCalendarToolbar } from "./RoutineCalendarToolbar";
import type { Routine } from "@shared/types/bots/routines.types";
import type { CalendarDay, RoutineCalendarEntryActions, RoutineCalendarView } from "@/components/app/types/routineCalendar.types";

/**
 * Every bot's routines on one calendar, in the Bots home: past days show what ran and how it went, later days what the
 * schedules will run. Days and times are on your own clock; each routine's details show its own timezone.
 */
export function RoutineCalendarPage() {
  const { state, store } = useThreadCenterPorts();
  const [view, setView] = useState<RoutineCalendarView>("week");
  const [anchor, setAnchor] = useState<CalendarDay>(() => calendarDayOf(new Date()));
  const [editing, setEditing] = useState<Routine | null>(null);
  const span = useMemo(() => calendarSpan(view, anchor), [view, anchor]);
  const calendar = useRoutineCalendar(span);
  const byDay = useMemo(() => entriesByDay(calendar.calendar), [calendar.calendar]);
  const today = calendarDayOf(new Date());
  const { personalization, sharedBots } = state.boot;
  const editingBot = editing ? findEffectiveBot(personalization.bots, editing.workspaceId, sharedBots, editing.botId) : null;
  const actions: RoutineCalendarEntryActions = {
    busy: calendar.busy,
    openerFor: (conversationId) => state.summaries.some((entry) => entry.conversation.id === conversationId) ? () => { store.openThread(conversationId); } : null,
    onEdit: setEditing,
    onRunNow: (routine) => void calendar.runNow(routine),
    onToggle: (routine) => void calendar.setActive(routine, !routine.active)
  };
  const showDay = (day: CalendarDay): void => { setAnchor(day); setView("day"); };
  const empty = !calendar.loading && calendar.calendar?.routines.length === 0;
  // The Bots home's frame, so the tabs stay put when switching pages; the calendar sits in a bordered card inside it.
  return <section aria-label="Routines calendar" className={cn(BOTS_HOME_SCROLL_CLASS, "flex flex-col overflow-hidden")}>
    <div className={cn(BOTS_HOME_COLUMN_CLASS, "min-h-0 flex-1 pb-6 sm:pb-10")}>
      <header className="space-y-4 pb-4">
        <BotsHomeTabs page="routines" />
        <div className="flex items-center gap-2"><CalendarDays className="size-5 text-muted-foreground" aria-hidden="true" /><h1 className="text-xl font-semibold tracking-tight">Routines</h1></div>
      </header>
      {calendar.error && <p role="alert" className="mb-3 rounded-md bg-destructive/5 px-3 py-2 text-xs text-destructive">{calendar.error}</p>}
      {empty && <p className="mb-3 text-xs text-muted-foreground">No routines yet. Open a bot's info from the Bots sidebar and use Add routine to give it scheduled work.</p>}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        <RoutineCalendarToolbar title={calendarTitle(view, anchor, span.days)} view={view} onViewChange={setView}
          onMove={(delta) => setAnchor((current) => moveCalendarAnchor(view, current, delta))} onToday={() => setAnchor(today)} />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" aria-busy={calendar.loading}>
          {view === "day" ? <RoutineCalendarDayList items={byDay.get(anchor) ?? []} {...actions} />
            : <RoutineCalendarGrid days={span.days} byDay={byDay} today={today} month={view === "month" ? anchor : null} onShowDay={showDay} {...actions} />}
        </div>
      </div>
    </div>
    {editing && editingBot && <CalendarRoutineEditor key={editing.id} bot={editingBot} routine={editing} workspaces={state.boot.workspaces} onClose={() => setEditing(null)} />}
  </section>;
}
