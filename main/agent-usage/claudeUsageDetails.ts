import type { ToolUsageDetail } from "@shared/appTypes";
import { getJsonObject, getNumber, getString } from "../jsonValue";
import type { ClaudeUsageLimit } from "../types/agent-usage/claudeUsageLimits.types";
import { formatClaudeLimitName } from "./claudeUsageLimits";
import { formatMinorCurrency, formatPlanName } from "./toolUsageInfo";

/** `spend.used` / `spend.limit`: `{ amount_minor, currency, exponent }`. */
const readSpendMoney = (value: unknown): string | null => {
  const money = getJsonObject(value);
  const amountMinor = getNumber(money?.amount_minor);
  const currency = getString(money?.currency);
  return amountMinor !== null && currency ? formatMinorCurrency(amountMinor, getNumber(money?.exponent) ?? 2, currency) : null;
};

/** `spend`: usage credits that cover overflow once plan limits are hit. */
const buildCreditsDetail = (spend: Record<string, unknown> | null): ToolUsageDetail[] => {
  if (spend?.enabled !== true) {
    return [];
  }
  const used = readSpendMoney(spend.used);
  const limit = readSpendMoney(spend.limit);
  return used ? [{ label: "Credits", value: limit ? `${used} of ${limit} used` : `${used} used` }] : [];
};

/** `extra_usage`: `used_credits` / `monthly_limit` in minor units scaled by `decimal_places`. */
const buildExtraUsageDetail = (extraUsage: Record<string, unknown> | null): ToolUsageDetail[] => {
  const used = getNumber(extraUsage?.used_credits);
  if (extraUsage?.is_enabled !== true || used === null) {
    return [];
  }
  const currency = getString(extraUsage.currency) ?? "USD";
  const decimals = getNumber(extraUsage.decimal_places) ?? 2;
  const limit = getNumber(extraUsage.monthly_limit);
  const usedLabel = formatMinorCurrency(used, decimals, currency);
  return [{
    label: "Extra usage",
    value: limit !== null ? `${usedLabel} of ${formatMinorCurrency(limit, decimals, currency)} this month` : `${usedLabel} this month`
  }];
};

export const buildClaudePlanDetail = (subscriptionType: string | null): ToolUsageDetail[] =>
  subscriptionType ? [{ label: "Plan", value: formatPlanName(subscriptionType) }] : [];

/** Extra facts from the `/api/oauth/usage` payload beyond the limit percentages. */
export const buildClaudeUsageDetails = (payload: unknown, limits: ClaudeUsageLimit[]): ToolUsageDetail[] => {
  const record = getJsonObject(payload);
  const lockedReason = getString(getJsonObject(record?.five_hour)?.locked_reason);
  return [
    ...limits
      .filter((limit) => limit.severity && limit.severity !== "normal")
      .map((limit) => ({ label: formatClaudeLimitName(limit), value: `Severity: ${limit.severity}` })),
    ...(lockedReason ? [{ label: "Locked", value: lockedReason }] : []),
    ...buildCreditsDetail(getJsonObject(record?.spend)),
    ...buildExtraUsageDetail(getJsonObject(record?.extra_usage))
  ];
};
