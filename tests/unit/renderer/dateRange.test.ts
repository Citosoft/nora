import assert from "node:assert/strict";
import test from "node:test";
import { dateRangeFor, isDateRangePreset } from "@/components/app/logic/apps/dateRange";

test("presets resolve to local calendar dates, custom leaves them to the user", () => {
  const now = new Date(2026, 10, 20, 15, 30);
  assert.deepEqual(dateRangeFor("today", now), { from: "2026-11-20", to: "2026-11-20" });
  assert.deepEqual(dateRangeFor("last7", now), { from: "2026-11-14", to: "2026-11-20" });
  assert.deepEqual(dateRangeFor("last30", now), { from: "2026-10-22", to: "2026-11-20" });
  assert.deepEqual(dateRangeFor("thisMonth", now), { from: "2026-11-01", to: "2026-11-20" });
  assert.deepEqual(dateRangeFor("lastMonth", now), { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(dateRangeFor("lastMonth", new Date(2026, 0, 5)), { from: "2025-12-01", to: "2025-12-31" }, "crosses the year");
  assert.equal(dateRangeFor("custom", now), null);
  assert.equal(isDateRangePreset("last7"), true);
  assert.equal(isDateRangePreset("yesterday"), false);
});
