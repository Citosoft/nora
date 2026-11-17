import { z } from "zod";
import { botIdSchema } from "@shared/bots/contracts";
import { routineCalendarRangeSchema, routineCalendarSchema, routineIdSchema, routineInputSchema, routineListSchema } from "./contracts";

export const botRoutinesChannel = "bot-routines:request";
/** Pushed with the bot's id whenever a routine or run of that bot changes, including scheduled runs nobody asked for in the window. */
export const botRoutinesChangedChannel = "bot-routines:changed";

/** Every request names its bot; replies carry the bot's routines and recent runs, so the window always shows the stored truth. */
export const botRoutineRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list"), botId: botIdSchema }).strict(),
  z.object({ kind: z.literal("create"), routine: routineInputSchema }).strict(),
  z.object({ kind: z.literal("update"), botId: botIdSchema, id: routineIdSchema, routine: routineInputSchema }).strict(),
  z.object({ kind: z.literal("set-active"), botId: botIdSchema, id: routineIdSchema, active: z.boolean() }).strict(),
  z.object({ kind: z.literal("remove"), botId: botIdSchema, id: routineIdSchema }).strict(),
  /** Starts a run now, also for a paused routine; it does not move the schedule. */
  z.object({ kind: z.literal("run-now"), botId: botIdSchema, id: routineIdSchema }).strict()
]);
export const botRoutineReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), list: routineListSchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
export const botRoutinesChangedSchema = z.object({ botId: botIdSchema }).strict();

/** Every bot's routines and their runs in a range: past runs from history, later ones planned from the schedules. */
export const routineCalendarChannel = "bot-routines:calendar";
export const routineCalendarRequestSchema = routineCalendarRangeSchema;
export const routineCalendarReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), calendar: routineCalendarSchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
