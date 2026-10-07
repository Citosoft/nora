import type { ToolUsageDetail, ToolUsageWindow } from "@shared/appTypes";
import { getJsonObject, getNumber, getString } from "../jsonValue";
import type { CursorPeriodUsage } from "../types/agent-usage/cursorUsage.types";
import { clampPercent, formatMinorCurrency, formatPlanName, formatUsageResetLabel } from "./toolUsageInfo";

/** `billingCycleEnd` is epoch milliseconds encoded as a string. */
const readEpochMsString = (value: unknown): number | null => {
  const raw = getString(value);
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

/** Reads `planUsage.totalPercentUsed` and friends; returns null when the plan usage block is missing. */
export const parseCursorPeriodUsage = (payload: unknown): CursorPeriodUsage | null => {
  const record = getJsonObject(payload);
  const planUsage = getJsonObject(record?.planUsage);
  const totalPercentUsed = getNumber(planUsage?.totalPercentUsed);
  if (!record || totalPercentUsed === null) {
    return null;
  }
  return {
    billingCycleEndMs: readEpochMsString(record.billingCycleEnd),
    totalPercentUsed,
    autoPercentUsed: getNumber(planUsage?.autoPercentUsed),
    apiPercentUsed: getNumber(planUsage?.apiPercentUsed),
    bonusSpendCents: getNumber(planUsage?.bonusSpend)
  };
};

export const buildCursorUsageWindows = (usage: CursorPeriodUsage, now: Date): ToolUsageWindow[] => [{
  id: "monthly",
  label: "Monthly",
  shortLabel: "M",
  percentLeft: clampPercent(100 - usage.totalPercentUsed),
  resetsLabel: usage.billingCycleEndMs !== null ? formatUsageResetLabel(new Date(usage.billingCycleEndMs), now) : null
}];

/** The dashboard splits included usage into Auto/Composer and named API models; bonus is free extra usage. */
export const buildCursorUsageDetails = (usage: CursorPeriodUsage, membershipType: string | null): ToolUsageDetail[] => [
  ...(membershipType ? [{ label: "Plan", value: formatPlanName(membershipType) }] : []),
  ...(usage.autoPercentUsed !== null ? [{ label: "Auto + Composer", value: `${clampPercent(usage.autoPercentUsed)}% used` }] : []),
  ...(usage.apiPercentUsed !== null ? [{ label: "API models", value: `${clampPercent(usage.apiPercentUsed)}% used` }] : []),
  ...(usage.bonusSpendCents ? [{ label: "Bonus usage", value: formatMinorCurrency(usage.bonusSpendCents, 2, "USD") }] : [])
];
