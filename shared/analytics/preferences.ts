import type { AnalyticsPreferences, AnalyticsPreferencesPatch } from "@shared/types/analytics.types";

/**
 * Keeps the two privacy choices consistent: objecting to usage statistics also withdraws detailed consent (detailed
 * analytics includes those statistics), and opting in to detailed analytics turns statistics back on.
 */
export function applyAnalyticsPreferences(current: AnalyticsPreferences, patch: AnalyticsPreferencesPatch): AnalyticsPreferences {
  const next = { ...current, ...patch };
  if (patch.usageStatisticsEnabled === false) return { ...next, analyticsConsentStatus: "declined" };
  if (patch.analyticsConsentStatus === "granted") return { ...next, usageStatisticsEnabled: true };
  return next;
}
