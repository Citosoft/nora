import type { z } from "zod";
import type { botRoutineReplySchema, botRoutineRequestSchema, botRoutinesChangedSchema, routineCalendarReplySchema } from "@shared/bots/routines/gateway";
import type { RoutineCalendar, RoutineCalendarRange, RoutineList } from "@shared/types/bots/routines.types";

export type BotRoutineRequest = z.infer<typeof botRoutineRequestSchema>;
export type BotRoutineReply = z.infer<typeof botRoutineReplySchema>;
export type RoutineCalendarReply = z.infer<typeof routineCalendarReplySchema>;
export type BotRoutinesChanged = z.infer<typeof botRoutinesChangedSchema>;
export interface BotRoutineBridge {
  request(input: BotRoutineRequest): Promise<RoutineList>;
  /** Every bot's routines and their runs in the range. */
  calendar(range: RoutineCalendarRange): Promise<RoutineCalendar>;
  /** Called with a bot's id whenever its routines or runs change; returns an unsubscribe function. */
  onChanged(listener: (change: BotRoutinesChanged) => void): () => void;
}
