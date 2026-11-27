import type { AnalyticsLevel, AnalyticsTier } from "@shared/types/analytics.types";
import type { AnalyticsPolicyInput } from "@main/types/analytics/analytics.types";

/**
 * Regions whose cookie/device-storage rules (ePrivacy Directive art. 5(3) as implemented nationally, and Switzerland's
 * FADP/TCA) treat even anonymous product statistics read from a device as needing prior consent. The UK is deliberately
 * absent: PECR, as amended by the Data (Use and Access) Act 2025, allows statistical analytics that improve a service when
 * the user is told and can object easily. Keep this list as the single place to change if legal advice differs.
 */
const CONSENT_REQUIRED_COUNTRIES: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "CH"
]);

/** An unknown region is treated as the strictest case rather than guessed. */
export function usageStatisticsRequireConsent(countryCode: string | null): boolean {
  return !countryCode || CONSENT_REQUIRED_COUNTRIES.has(countryCode.trim().toUpperCase());
}

export function resolveAnalyticsLevel(input: AnalyticsPolicyInput): AnalyticsLevel {
  if (!input.runtimeAllowed || !input.configured || !input.usageStatisticsEnabled) return "off";
  if (input.consentStatus === "granted") return "detailed";
  return input.consentRequired ? "off" : "anonymous";
}

export function levelAllows(level: AnalyticsLevel, tier: AnalyticsTier): boolean {
  if (level === "off") return false;
  return level === "detailed" || tier === "anonymous";
}
