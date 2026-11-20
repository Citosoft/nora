import type { z } from "zod";
import type { ROUTINE_INTERVAL_UNITS, ROUTINE_MISSED_POLICIES, ROUTINE_RUN_PLACES, ROUTINE_RUN_STATUSES, routineCalendarEntrySchema, routineCalendarRangeSchema,
  pausedRoutineInputSchema, routineCalendarRoutineSchema, routineCalendarSchema, routineInputSchema, routineListSchema, routineRunSchema, routineScheduleSchema, routineSchema } from "@shared/bots/routines/contracts";

export type RoutineSchedule = z.infer<typeof routineScheduleSchema>;
export type RoutineScheduleKind = RoutineSchedule["kind"];
export type RoutineIntervalUnit = (typeof ROUTINE_INTERVAL_UNITS)[number];
export type RoutineRunPlace = (typeof ROUTINE_RUN_PLACES)[number];
export type RoutineMissedPolicy = (typeof ROUTINE_MISSED_POLICIES)[number];
export type RoutineRunStatus = (typeof ROUTINE_RUN_STATUSES)[number];
export type Routine = z.infer<typeof routineSchema>;
export type RoutineRun = z.infer<typeof routineRunSchema>;
export type PausedRoutineInput = z.infer<typeof pausedRoutineInputSchema>;
export type RoutineInput = z.infer<typeof routineInputSchema>;
export type RoutineList = z.infer<typeof routineListSchema>;
export type RoutineCalendarRange = z.infer<typeof routineCalendarRangeSchema>;
export type RoutineCalendarRoutine = z.infer<typeof routineCalendarRoutineSchema>;
export type RoutineCalendarEntry = z.infer<typeof routineCalendarEntrySchema>;
export type RoutineCalendarEntryStatus = RoutineCalendarEntry["status"];
export type RoutineCalendar = z.infer<typeof routineCalendarSchema>;
/** A starting point for a new routine; intervals are excluded because their anchor is the moment the routine is saved. */
export interface RoutineTemplate {
  id: string;
  name: string;
  summary: string;
  instruction: string;
  runIn: RoutineRunPlace;
  schedule: Exclude<RoutineSchedule, { kind: "interval" }>;
}
/** Occurrences between two instants, counted up to a cap; `last` is the newest one that came due. */
export interface MissedOccurrences { count: number; truncated: boolean; last: Date; previous: Date | null; next: Date; }
