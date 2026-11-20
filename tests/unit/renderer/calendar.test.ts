import assert from "node:assert/strict";
import test from "node:test";
import { calendarMonth, rowDate, timelineGroups } from "@/components/app/logic/apps/calendar";

test("bare dates stay on their calendar day, datetimes land on their local day, and other values are skipped", () => {
  assert.equal(rowDate({ due: "2026-11-01" }, "due")?.getDate(), 1);
  assert.equal(rowDate({ due: "2026-11-01" }, "due")?.getMonth(), 10);
  assert.ok(rowDate({ at: "2026-11-05T10:00:00Z" }, "at"));
  assert.equal(rowDate({ at: "soon" }, "at"), null);
  assert.equal(rowDate({ at: null }, "at"), null);
});

test("a month grid starts on Monday, marks today and places rows on their days", () => {
  const rows = [{ id: 1, due: "2026-11-01" }, { id: 2, due: "2026-11-01" }, { id: 3, due: "2026-11-20" }, { id: 4, due: "2026-12-02" }];
  const month = calendarMonth(2026, 10, rows, "due", new Date(2026, 10, 20));
  assert.equal(month.label.includes("2026"), true);
  const days = month.weeks.flat();
  assert.equal(days[0]?.key, "2026-10-26", "November 2026 starts on a Sunday, so the grid opens on the Monday before");
  assert.equal(days.find((day) => day.key === "2026-11-01")?.rows.length, 2);
  assert.equal(days.find((day) => day.key === "2026-11-20")?.today, true);
  assert.equal(days.find((day) => day.key === "2026-12-02")?.inMonth, false);
});

test("a timeline groups dated rows by day in the chosen order", () => {
  const rows = [{ n: "a", at: "2026-11-01" }, { n: "b", at: "2026-11-20T09:00:00" }, { n: "c", at: "2026-11-20T18:00:00" }, { n: "d", at: "never" }];
  const newest = timelineGroups(rows, "at", "newest");
  assert.deepEqual(newest.map((group) => [group.key, group.rows.map((row) => row.n)]), [["2026-11-20", ["c", "b"]], ["2026-11-01", ["a"]]]);
  assert.deepEqual(timelineGroups(rows, "at", "oldest").map((group) => group.key), ["2026-11-01", "2026-11-20"]);
});
