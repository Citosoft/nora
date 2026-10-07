import type { ToolUsageInfo } from "@shared/appTypes";
import type { ClaudeUsageStatusInput } from "../types/agent-usage/claudeUsageLimits.types";
import { readClaudeOAuthCredentials } from "./claudeOAuthCredentials";
import { buildClaudePlanDetail, buildClaudeUsageDetails } from "./claudeUsageDetails";
import { buildClaudeUsageWindows, parseClaudeUsageLimits } from "./claudeUsageLimits";
import { createToolUsageInfo } from "./toolUsageInfo";

const CLAUDE_USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
/** Required by the OAuth usage endpoint that Claude Code's own `/usage` command calls. */
const CLAUDE_OAUTH_BETA_HEADER = "oauth-2025-04-20";
const CLAUDE_USAGE_TIMEOUT_MS = 10_000;
const EXPIRED_NOTICE = "Claude Code's sign-in has expired. Open Claude Code to refresh it, then check again.";

export async function getClaudeUsageStatus(input: ClaudeUsageStatusInput): Promise<ToolUsageInfo> {
  const base = { title: input.title, account: input.account, lines: input.hintLines, fetchedAt: input.nowIso() };

  const credentials = await readClaudeOAuthCredentials(input.configDir);
  if (!credentials) {
    return createToolUsageInfo({
      ...base,
      status: "unavailable",
      notice: "Claude Code is not signed in with a Claude subscription, so there are no usage limits to show."
    });
  }
  const planDetails = buildClaudePlanDetail(credentials.subscriptionType);
  if (credentials.expiresAtMs !== null && credentials.expiresAtMs <= Date.now()) {
    return createToolUsageInfo({ ...base, status: "unavailable", notice: EXPIRED_NOTICE, details: planDetails });
  }

  try {
    const response = await fetch(CLAUDE_USAGE_URL, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "anthropic-beta": CLAUDE_OAUTH_BETA_HEADER
      },
      signal: AbortSignal.timeout(CLAUDE_USAGE_TIMEOUT_MS)
    });
    if (response.status === 401 || response.status === 403) {
      return createToolUsageInfo({ ...base, status: "unavailable", notice: EXPIRED_NOTICE, details: planDetails });
    }
    if (!response.ok) {
      const notice = response.status === 429
        ? "Claude usage is rate limited right now. Try again in a few minutes."
        : `Claude usage request failed (HTTP ${response.status}).`;
      return createToolUsageInfo({ ...base, status: "error", notice, details: planDetails });
    }

    const payload: unknown = await response.json();
    const limits = parseClaudeUsageLimits(payload);
    return createToolUsageInfo({
      ...base,
      status: "available",
      windows: buildClaudeUsageWindows(limits, new Date()),
      details: [...planDetails, ...buildClaudeUsageDetails(payload, limits)],
      ...(limits.length ? {} : { notice: "Claude did not report any usage limits." })
    });
  } catch (error: unknown) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timed out" : "could not be reached";
    return createToolUsageInfo({ ...base, status: "error", notice: `Claude usage ${reason}.`, details: planDetails });
  }
}
