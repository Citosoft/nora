import type { ToolUsageWindow } from "@shared/appTypes";
import { getJsonArray, getJsonObject, getNumber, getString } from "../jsonValue";
import type { ClaudeUsageLimit } from "../types/agent-usage/claudeUsageLimits.types";
import { clampPercent, formatUsageResetLabel } from "./toolUsageInfo";

/**
 * Reads the `limits` array of `/api/oauth/usage`. Each entry is `{ kind, percent, resets_at, severity, scope }`
 * where `kind` is `session`, `weekly_all`, or `weekly_scoped` (with `scope.model.display_name`). Windows the
 * account's plan does not have are simply absent, so missing weekly entries mean "no weekly limit".
 */
export const parseClaudeUsageLimits = (payload: unknown): ClaudeUsageLimit[] =>
  getJsonArray(getJsonObject(payload)?.limits).flatMap((item): ClaudeUsageLimit[] => {
    const limit = getJsonObject(item);
    const percentUsed = getNumber(limit?.percent);
    if (!limit || percentUsed === null) {
      return [];
    }
    const resetsAt = getString(limit.resets_at);
    const severity = getString(limit.severity);
    switch (limit.kind) {
      case "session":
        return [{ kind: "session", scopeLabel: null, percentUsed, resetsAt, severity }];
      case "weekly_all":
        return [{ kind: "weekly", scopeLabel: null, percentUsed, resetsAt, severity }];
      case "weekly_scoped": {
        const scopeLabel = getString(getJsonObject(getJsonObject(limit.scope)?.model)?.display_name);
        return scopeLabel ? [{ kind: "weekly", scopeLabel, percentUsed, resetsAt, severity }] : [];
      }
      default:
        return [];
    }
  });

export const formatClaudeLimitName = (limit: ClaudeUsageLimit): string => {
  if (limit.kind === "session") {
    return "Session";
  }
  return limit.scopeLabel ? `Weekly · ${limit.scopeLabel}` : "Weekly";
};

const limitRank = (limit: ClaudeUsageLimit): number =>
  limit.kind === "session" ? 0 : limit.scopeLabel === null ? 1 : 2;

/** Session, then the all-models weekly window, then model-scoped weekly windows. */
export const buildClaudeUsageWindows = (limits: ClaudeUsageLimit[], now: Date): ToolUsageWindow[] =>
  [...limits]
    .sort((left, right) => limitRank(left) - limitRank(right))
    .map((limit) => ({
      id: limit.scopeLabel ? `${limit.kind}:${limit.scopeLabel}` : limit.kind,
      label: formatClaudeLimitName(limit),
      shortLabel: limit.kind === "session" ? "S" : "W",
      percentLeft: clampPercent(100 - limit.percentUsed),
      resetsLabel: limit.resetsAt ? formatUsageResetLabel(new Date(limit.resetsAt), now) : null
    }));
