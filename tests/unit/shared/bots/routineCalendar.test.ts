import assert from "node:assert/strict";
import test from "node:test";
import { buildRoutineCalendar } from "@shared/bots/routines/calendar";
import { ROUTINE_CALENDAR_OCCURRENCES_MAX, routineCalendarRangeSchema } from "@shared/bots/routines/contracts";
import type { Routine, RoutineRun, RoutineSchedule } from "@shared/types/bots/routines.types";

const routine = (id: string, schedule: RoutineSchedule, overrides: Partial<Routine> = {}): Routine => ({ id, botId: "ada", name: id, instruction: "Do it.", active: true,
  timezone: "UTC", schedule, workspaceId: "app", runIn: "chat", missedPolicy: "skip", nextRunAt: null, threadId: null,
  createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z", ...overrides });
const run = (id: string, routineId: string, scheduledFor: string, status: RoutineRun["status"]): RoutineRun => ({ id, routineId, botId: "ada", kind: "scheduled",
  scheduledFor, routineName: routineId, status, error: null, missed: null, conversationId: null, createdAt: scheduledFor, updatedAt: scheduledFor });
const bot = { name: "Ada", avatar: { seed: 7 } };
const week = { from: "2026-11-16T00:00:00.000Z", to: "2026-11-23T00:00:00.000Z" };

test("past runs come from history and later ones are planned from the schedule", () => {
  const daily = routine("daily", { kind: "daily", time: "09:00" }, { nextRunAt: "2026-11-18T09:00:00.000Z" });
  const calendar = buildRoutineCalendar(week, [{ routine: daily, bot }], [
    run("r1", "daily", "2026-11-16T09:00:00.000Z", "succeeded"), run("r2", "daily", "2026-11-17T09:00:00.000Z", "failed"),
    run("old", "daily", "2026-11-10T09:00:00.000Z", "succeeded")]);
  assert.deepEqual(calendar.entries.map((entry) => [entry.at.slice(0, 10), entry.status]), [
    ["2026-11-16", "succeeded"], ["2026-11-17", "failed"], ["2026-11-18", "scheduled"], ["2026-11-19", "scheduled"],
    ["2026-11-20", "scheduled"], ["2026-11-21", "scheduled"], ["2026-11-22", "scheduled"]]);
  assert.equal(calendar.entries[0].run?.id, "r1");
});

test("a range that starts after the next run plans from the range's start, and paused routines plan nothing", () => {
  const weekly = routine("weekly", { kind: "weekly", weekday: 3, time: "12:00" }, { nextRunAt: "2026-11-04T12:00:00.000Z" });
  const paused = routine("paused", { kind: "daily", time: "09:00" }, { active: false });
  const calendar = buildRoutineCalendar(week, [{ routine: weekly, bot }, { routine: paused, bot: null }], []);
  assert.deepEqual(calendar.entries.map((entry) => [entry.routineId, entry.at]), [["weekly", "2026-11-18T12:00:00.000Z"]]);
  assert.equal(calendar.routines.length, 2, "paused routines are still listed");
});

test("one-time routines appear once, and very frequent routines are capped", () => {
  const once = routine("once", { kind: "once", date: "2026-11-20", time: "07:00" }, { nextRunAt: "2026-11-20T07:00:00.000Z" });
  const busy = routine("busy", { kind: "interval", amount: 3, unit: "minutes", anchorAt: "2026-11-16T00:00:00.000Z" }, { nextRunAt: "2026-11-16T00:03:00.000Z" });
  const calendar = buildRoutineCalendar(week, [{ routine: once, bot }, { routine: busy, bot }], []);
  assert.deepEqual(calendar.entries.filter((entry) => entry.routineId === "once").map((entry) => entry.at), ["2026-11-20T07:00:00.000Z"]);
  const frequent = calendar.entries.filter((entry) => entry.routineId === "busy");
  assert.equal(frequent.length, ROUTINE_CALENDAR_OCCURRENCES_MAX);
  assert.equal(frequent.at(-1)?.truncated, true);
});

test("calendar ranges must move forward and stay within two months", () => {
  assert.equal(routineCalendarRangeSchema.safeParse(week).success, true);
  assert.equal(routineCalendarRangeSchema.safeParse({ from: week.to, to: week.from }).success, false);
  assert.equal(routineCalendarRangeSchema.safeParse({ from: "2026-01-01T00:00:00.000Z", to: "2026-04-01T00:00:00.000Z" }).success, false);
});
