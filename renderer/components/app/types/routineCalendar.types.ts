import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { Routine, RoutineCalendar, RoutineCalendarEntry, RoutineCalendarRoutine } from "@shared/types/bots/routines.types";

export type RoutineCalendarView = "month" | "week" | "day";
/** A local calendar date, "YYYY-MM-DD", on the viewer's own clock. */
export type CalendarDay = string;
export interface RoutineCalendarSpan { days: readonly CalendarDay[]; from: string; to: string; }
/** What the calendar shows for one day: the entries placed on it, each with its routine. */
export interface RoutineCalendarDayEntry { entry: RoutineCalendarEntry; routine: RoutineCalendarRoutine; }

export interface RoutineCalendarState {
  calendar: RoutineCalendar | null;
  loading: boolean;
  /** A failed load or action; the last calendar stays visible beside it. */
  error: string | null;
  busy: boolean;
  runNow(routine: Routine): Promise<void>;
  setActive(routine: Routine, active: boolean): Promise<void>;
}

export interface RoutineCalendarEntryActions {
  /** Opens the thread a past run worked in, or null when it is not listed in this window. */
  openerFor(conversationId: string): (() => void) | null;
  onEdit(routine: Routine): void;
  onRunNow(routine: Routine): void;
  onToggle(routine: Routine): void;
  busy: boolean;
}
export interface RoutineCalendarEntryChipProps extends RoutineCalendarEntryActions { item: RoutineCalendarDayEntry; detailed?: boolean; }
export interface RoutineCalendarGridProps extends RoutineCalendarEntryActions {
  days: readonly CalendarDay[];
  byDay: ReadonlyMap<CalendarDay, readonly RoutineCalendarDayEntry[]>;
  today: CalendarDay;
  /** The month a month grid shows; days of the months beside it are dimmed. */
  month: CalendarDay | null;
  onShowDay(day: CalendarDay): void;
}
export interface RoutineCalendarDayListProps extends RoutineCalendarEntryActions { items: readonly RoutineCalendarDayEntry[]; }
export interface RoutineCalendarToolbarProps {
  title: string;
  view: RoutineCalendarView;
  onViewChange(view: RoutineCalendarView): void;
  onMove(delta: -1 | 1): void;
  onToday(): void;
}
/** The Bots home's two pages; the sidebar's Routines button opens the second. */
export type BotsHomePage = "bots" | "routines";
export interface BotsHomeTabsProps { page: BotsHomePage; }
export interface CalendarRoutineEditorProps { bot: BotDefinition; routine: Routine; workspaces: readonly NativeWorkspace[]; onClose(): void; }
