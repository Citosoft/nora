import assert from "node:assert/strict";
import test from "node:test";
import { formatThreadAge } from "@/components/app/logic/thread-workspace/threadAge";

const now = Date.parse("2026-11-11T12:00:00.000Z");
const age = (seconds: number) => formatThreadAge(new Date(now - seconds * 1000).toISOString(), now);

test("thread ages show compact last-activity units at minute, hour, day, week, month and year boundaries", () => {
  for (const [seconds, label] of [[0, "now"], [59, "now"], [60, "1m"], [5 * 60, "5m"], [3599, "59m"], [3600, "1h"],
    [2 * 3600, "2h"], [86400, "1d"], [3 * 86400, "3d"], [7 * 86400, "1w"], [30 * 86400, "1mo"], [365 * 86400, "1y"]] as const) {
    assert.equal(age(seconds)?.label, label);
  }
  assert.equal(age(60)?.description, "Last activity 1 minute ago");
  assert.equal(age(120)?.description, "Last activity 2 minutes ago");
});

test("thread ages tolerate clock skew and omit invalid timestamps", () => {
  assert.equal(age(-3600)?.label, "now");
  assert.equal(formatThreadAge("invalid", now), null);
  assert.equal(formatThreadAge("2026-11-11T12:00:00Z", Number.NaN), null);
});
