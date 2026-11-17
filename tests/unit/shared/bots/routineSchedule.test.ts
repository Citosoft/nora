import assert from "node:assert/strict";
import test from "node:test";
import { missedOccurrences, nextRoutineOccurrence, RoutineScheduleError, validateRoutineSchedule } from "@shared/bots/routines/schedule";
import { describeRoutineSchedule } from "@shared/bots/routines/describe";
import type { RoutineSchedule } from "@shared/types/bots/routines.types";

const next = (schedule: RoutineSchedule, timezone: string, after: string): string | undefined =>
  nextRoutineOccurrence(schedule, timezone, new Date(after))?.toISOString();

test("daily schedules follow the routine's clock across daylight saving", () => {
  // London is UTC+0 in winter and UTC+1 in summer.
  assert.equal(next({ kind: "daily", time: "09:00" }, "Europe/London", "2026-03-01T12:00:00.000Z"), "2026-03-02T09:00:00.000Z");
  assert.equal(next({ kind: "daily", time: "09:00" }, "Europe/London", "2026-06-01T12:00:00.000Z"), "2026-06-02T08:00:00.000Z");
  assert.equal(next({ kind: "daily", time: "09:00" }, "America/New_York", "2026-11-15T12:00:00.000Z"), "2026-11-15T14:00:00.000Z");
});

test("a wall time skipped by the clock change runs only on days it exists", () => {
  // 01:30 does not exist in London on 2026-03-29.
  assert.equal(next({ kind: "daily", time: "01:30" }, "Europe/London", "2026-03-28T12:00:00.000Z"), "2026-03-30T00:30:00.000Z");
});

test("weekdays skip the weekend and weekly picks its day", () => {
  // 2026-11-13 is a Friday.
  assert.equal(next({ kind: "weekdays", time: "09:00" }, "UTC", "2026-11-13T10:00:00.000Z"), "2026-11-16T09:00:00.000Z");
  assert.equal(next({ kind: "weekly", weekday: 3, time: "17:30" }, "UTC", "2026-11-13T10:00:00.000Z"), "2026-11-18T17:30:00.000Z");
});

test("monthly schedules skip months without the day", () => {
  assert.equal(next({ kind: "monthly", day: 31, time: "08:00" }, "UTC", "2026-11-01T00:00:00.000Z"), "2026-12-31T08:00:00.000Z");
});

test("intervals count from their anchor, and one-time schedules end", () => {
  const interval: RoutineSchedule = { kind: "interval", amount: 2, unit: "hours", anchorAt: "2026-11-15T10:00:00.000Z" };
  assert.equal(next(interval, "UTC", "2026-11-15T09:00:00.000Z"), "2026-11-15T10:00:00.000Z");
  assert.equal(next(interval, "UTC", "2026-11-15T13:10:00.000Z"), "2026-11-15T14:00:00.000Z");
  const once: RoutineSchedule = { kind: "once", date: "2026-11-20", time: "07:15" };
  assert.equal(next(once, "Asia/Tokyo", "2026-11-15T00:00:00.000Z"), "2026-11-19T22:15:00.000Z");
  assert.equal(next(once, "Asia/Tokyo", "2026-11-21T00:00:00.000Z"), undefined);
});

test("custom cron expressions support lists, ranges, steps and either-day matching", () => {
  assert.equal(next({ kind: "custom", expression: "*/15 9-10 * * 1-5" }, "UTC", "2026-11-16T09:20:00.000Z"), "2026-11-16T09:30:00.000Z");
  assert.equal(next({ kind: "custom", expression: "0 12 1 * 0" }, "UTC", "2026-11-16T00:00:00.000Z"), "2026-11-22T12:00:00.000Z");
  assert.equal(next({ kind: "custom", expression: "0 12 * * 7" }, "UTC", "2026-11-16T00:00:00.000Z"), "2026-11-22T12:00:00.000Z");
});

test("schedules that are invalid or too frequent are refused with a message", () => {
  assert.throws(() => validateRoutineSchedule({ kind: "custom", expression: "* * * *" }, "UTC"), RoutineScheduleError);
  assert.throws(() => validateRoutineSchedule({ kind: "custom", expression: "* * * * *" }, "UTC"), /every 3 minutes/);
  assert.throws(() => validateRoutineSchedule({ kind: "custom", expression: "0x5 * * * *" }, "UTC"), /minute field/);
  assert.throws(() => validateRoutineSchedule({ kind: "interval", amount: 1, unit: "minutes", anchorAt: "2026-11-15T10:00:00.000Z" }, "UTC"), /every 3 minutes/);
  assert.throws(() => validateRoutineSchedule({ kind: "daily", time: "09:00" }, "Mars/Olympus"), /timezone/);
  assert.doesNotThrow(() => validateRoutineSchedule({ kind: "custom", expression: "0 9 * * 1-5" }, "Europe/London"));
});

test("missed occurrences are counted, not replayed", () => {
  const missed = missedOccurrences({ kind: "daily", time: "09:00" }, "UTC", new Date("2026-11-10T09:00:00.000Z"), new Date("2026-11-15T12:00:00.000Z"));
  assert.equal(missed.count, 6);
  assert.equal(missed.last.toISOString(), "2026-11-15T09:00:00.000Z");
  assert.equal(missed.previous?.toISOString(), "2026-11-14T09:00:00.000Z");
  assert.equal(missed.next.toISOString(), "2026-11-16T09:00:00.000Z");
  const capped = missedOccurrences({ kind: "hourly", minute: 0 }, "UTC", new Date("2026-01-01T00:00:00.000Z"), new Date("2026-11-15T12:30:00.000Z"));
  assert.equal(capped.truncated, true);
  assert.equal(capped.next.toISOString(), "2026-11-15T13:00:00.000Z");
});

test("schedules read as one line", () => {
  assert.equal(describeRoutineSchedule({ kind: "weekdays", time: "09:00" }), "Weekdays at 09:00");
  assert.equal(describeRoutineSchedule({ kind: "monthly", day: 22, time: "08:00" }), "Monthly on the 22nd at 08:00");
  assert.equal(describeRoutineSchedule({ kind: "interval", amount: 1, unit: "hours", anchorAt: "2026-11-15T10:00:00.000Z" }), "Every hour");
  assert.equal(describeRoutineSchedule({ kind: "interval", amount: 3, unit: "days", anchorAt: "2026-11-15T10:00:00.000Z" }), "Every 3 days");
});
