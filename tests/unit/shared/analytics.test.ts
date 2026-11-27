import assert from "node:assert/strict";
import test from "node:test";
import { applyAnalyticsPreferences } from "@shared/analytics/preferences";
import { rendererAnalyticsEventSchema } from "@shared/analytics/events";

test("objecting to statistics withdraws detailed consent, and opting in restores statistics", () => {
  assert.deepEqual(applyAnalyticsPreferences({ analyticsConsentStatus: "granted", usageStatisticsEnabled: true }, { usageStatisticsEnabled: false }),
    { analyticsConsentStatus: "declined", usageStatisticsEnabled: false });
  assert.deepEqual(applyAnalyticsPreferences({ analyticsConsentStatus: "declined", usageStatisticsEnabled: false }, { analyticsConsentStatus: "granted" }),
    { analyticsConsentStatus: "granted", usageStatisticsEnabled: true });
  assert.deepEqual(applyAnalyticsPreferences({ analyticsConsentStatus: "granted", usageStatisticsEnabled: true }, { analyticsConsentStatus: "declined" }),
    { analyticsConsentStatus: "declined", usageStatisticsEnabled: true });
});

test("the window can only send catalogued events with identifier-shaped values", () => {
  assert.equal(rendererAnalyticsEventSchema.safeParse({ name: "view.opened", properties: { view: "settings:privacy" } }).success, true);
  for (const input of [
    { name: "view.opened", properties: { view: "settings:privacy", projectName: "Acme" } },
    { name: "view.opened", properties: { view: "My secret project" } },
    { name: "turn.finished", properties: {} },
    { name: "error.occurred", properties: { source: "main", errorName: "Error", errorCode: null, context: null } }
  ]) assert.equal(rendererAnalyticsEventSchema.safeParse(input).success, false, JSON.stringify(input));
});
