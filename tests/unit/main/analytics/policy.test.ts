import assert from "node:assert/strict";
import test from "node:test";
import { levelAllows, resolveAnalyticsLevel, usageStatisticsRequireConsent } from "@main/helpers/analytics/policy";
import type { AnalyticsPolicyInput } from "@main/types/analytics/analytics.types";

const base: AnalyticsPolicyInput = {
  runtimeAllowed: true, configured: true, usageStatisticsEnabled: true, consentStatus: "unknown", consentRequired: false
};

test("opt-out regions send anonymous statistics until the user objects, and detailed only after opt-in", () => {
  assert.equal(resolveAnalyticsLevel(base), "anonymous");
  assert.equal(resolveAnalyticsLevel({ ...base, consentStatus: "declined" }), "anonymous");
  assert.equal(resolveAnalyticsLevel({ ...base, consentStatus: "granted" }), "detailed");
  assert.equal(resolveAnalyticsLevel({ ...base, usageStatisticsEnabled: false }), "off");
  // Objecting to statistics wins even over an earlier opt-in.
  assert.equal(resolveAnalyticsLevel({ ...base, usageStatisticsEnabled: false, consentStatus: "granted" }), "off");
});

test("consent regions send nothing until the user opts in", () => {
  const strict = { ...base, consentRequired: true };
  assert.equal(resolveAnalyticsLevel(strict), "off");
  assert.equal(resolveAnalyticsLevel({ ...strict, consentStatus: "declined" }), "off");
  assert.equal(resolveAnalyticsLevel({ ...strict, consentStatus: "granted" }), "detailed");
});

test("development runs and builds without a key never send", () => {
  assert.equal(resolveAnalyticsLevel({ ...base, consentStatus: "granted", runtimeAllowed: false }), "off");
  assert.equal(resolveAnalyticsLevel({ ...base, consentStatus: "granted", configured: false }), "off");
});

test("EEA, Swiss and unknown regions need consent; the UK and US do not", () => {
  for (const country of ["DE", "fr", "IE", "NO", "CH", null, ""]) assert.equal(usageStatisticsRequireConsent(country), true, String(country));
  for (const country of ["GB", "US", "CA", "AU", "JP"]) assert.equal(usageStatisticsRequireConsent(country), false, country);
});

test("levels allow their own tier and every lower one", () => {
  assert.equal(levelAllows("off", "anonymous"), false);
  assert.equal(levelAllows("anonymous", "anonymous"), true);
  assert.equal(levelAllows("anonymous", "detailed"), false);
  assert.equal(levelAllows("detailed", "detailed"), true);
});
