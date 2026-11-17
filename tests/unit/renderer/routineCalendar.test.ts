import assert from "node:assert/strict";
import test from "node:test";
import { addDays, calendarDayOf, calendarSpan, calendarTitle, entriesByDay, moveCalendarAnchor } from "@/components/app/logic/routineCalendar";
import type { RoutineCalendar } from "@shared/types/bots/routines.types";

test("week and day spans cover whole local days starting on Monday", () => {
  const week = calendarSpan("week", "2026-11-19");
  assert.deepEqual(week.days, ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
  assert.equal(calendarDayOf(new Date(week.from)), "2026-11-16");
  assert.equal(calendarDayOf(new Date(week.to)), "2026-11-23");
  assert.deepEqual(calendarSpan("day", "2026-11-19").days, ["2026-11-19"]);
});

test("a month span is whole weeks around the month", () => {
  const november = calendarSpan("month", "2026-11-19");
  assert.equal(november.days[0], "2026-10-26");
  assert.equal(november.days.at(-1), "2026-12-06");
  assert.equal(november.days.length % 7, 0);
  // February 2027 starts on a Monday and ends on a Sunday: exactly four rows.
  assert.equal(calendarSpan("month", "2027-02-10").days.length, 28);
});

test("moving keeps month anchors on the first so short months never skip", () => {
  assert.equal(moveCalendarAnchor("month", "2027-01-31", 1), "2027-02-01");
  assert.equal(moveCalendarAnchor("week", "2026-11-19", -1), "2026-11-12");
  assert.equal(moveCalendarAnchor("day", "2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-28", 2), "2026-03-30");
});

test("titles read naturally for each view", () => {
  assert.equal(calendarTitle("month", "2026-11-19", []), "November 2026");
  assert.equal(calendarTitle("week", "2026-11-19", calendarSpan("week", "2026-11-19").days), "16 – 22 Nov 2026");
  assert.equal(calendarTitle("week", "2026-12-01", calendarSpan("week", "2026-12-01").days), "30 Nov – 6 Dec 2026");
});

test("entries group by the local day they fall on, and entries without a routine are dropped", () => {
  const at = new Date(2026, 10, 18, 9, 0).toISOString();
  const routine = { routine: { id: "r" } as RoutineCalendar["routines"][number]["routine"], bot: null };
  const entry = (id: string, routineId: string) => ({ id, routineId, at, status: "scheduled" as const, run: null, truncated: false });
  const byDay = entriesByDay({ from: at, to: at, routines: [routine], entries: [entry("a", "r"), entry("b", "gone")] });
  assert.deepEqual([...byDay.keys()], ["2026-11-18"]);
  assert.deepEqual(byDay.get("2026-11-18")?.map((item) => item.entry.id), ["a"]);
});
