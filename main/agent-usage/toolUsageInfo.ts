import type { ToolUsageInfo, ToolUsageWindow } from "@shared/appTypes";
import type { ToolUsageInfoInput } from "../types/agent-usage/toolUsageInfo.types";

export const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const formatUsageWindowLine = (window: ToolUsageWindow): string =>
  `${window.label}: ${window.percentLeft}% left${window.resetsLabel ? ` (resets ${window.resetsLabel})` : ""}`;

/** Local, compact reset time: just the time when it is today, otherwise weekday, date, and time. */
export const formatUsageResetLabel = (resetsAt: Date, now: Date): string | null => {
  if (Number.isNaN(resetsAt.getTime())) {
    return null;
  }
  const time = resetsAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return resetsAt.toDateString() === now.toDateString()
    ? time
    : `${resetsAt.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} ${time}`;
};

export const formatPlanName = (plan: string): string => plan.charAt(0).toUpperCase() + plan.slice(1);

export const formatMinorCurrency = (amountMinor: number, exponent: number, currency: string): string =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountMinor / 10 ** exponent);

/** Single constructor for usage results so every provider fills the contract the same way. */
export const createToolUsageInfo = (input: ToolUsageInfoInput): ToolUsageInfo => {
  const windows = input.windows ?? [];
  return {
    status: input.status,
    title: input.title,
    windows,
    account: input.account ?? null,
    lines: [...(input.lines ?? []), ...windows.map(formatUsageWindowLine), ...(input.notice ? [input.notice] : [])],
    ...(input.notice ? { notice: input.notice } : {}),
    ...(input.details?.length ? { details: input.details } : {}),
    ...(input.rawOutput ? { rawOutput: input.rawOutput } : {}),
    fetchedAt: input.fetchedAt
  };
};
