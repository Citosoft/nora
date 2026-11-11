import assert from "node:assert/strict";
import test from "node:test";
import { describeUsageRings, hasUsageRings, selectUsageRings, usageTone } from "@/components/app/logic/usageRings";
import type { ToolUsageInfo, ToolUsageWindow } from "@shared/appTypes";

const window = (id: string, period: ToolUsageWindow["period"], label: string, percentLeft: number): ToolUsageWindow =>
  ({ id, period, label, shortLabel: label.charAt(0), percentLeft, resetsLabel: null });
const info = (windows: ToolUsageWindow[]): ToolUsageInfo =>
  ({ status: "available", title: "Usage", windows, account: null, lines: [], fetchedAt: "2026-11-11T00:00:00.000Z" });

test("selects the session ring and the first (all-models) weekly ring", () => {
  const rings = selectUsageRings(info([
    window("session", "session", "Session", 77),
    window("weekly", "weekly", "Weekly", 15),
    window("weekly:Sonnet", "weekly", "Weekly · Sonnet", 61)
  ]));
  assert.equal(rings.session?.percentUsed, 23);
  assert.equal(rings.weekly?.window.id, "weekly");
  assert.equal(rings.weekly?.tone, "warning");
  assert.equal(describeUsageRings(rings), "Weekly 85% used, Session 23% used");
});

test("monthly-only or missing usage has no rings", () => {
  assert.equal(hasUsageRings(selectUsageRings(info([window("monthly", "monthly", "Monthly", 50)]))), false);
  assert.equal(hasUsageRings(selectUsageRings(null)), false);
  assert.equal(describeUsageRings(selectUsageRings(null)), "Usage limits unavailable");
});

test("tone escalates at 75% and 90% used", () => {
  assert.deepEqual([74, 75, 89, 90, 100].map(usageTone), ["normal", "warning", "warning", "critical", "critical"]);
});
