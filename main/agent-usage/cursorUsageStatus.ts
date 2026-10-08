import type { ToolUsageInfo } from "@shared/appTypes";
import type { CursorUsageStatusInput } from "../types/agent-usage/cursorUsage.types";
import { readCursorAuthState } from "./cursorAuthState";
import { buildCursorUsageDetails, buildCursorUsageWindows, parseCursorPeriodUsage } from "./cursorUsage";
import { createToolUsageInfo } from "./toolUsageInfo";

/** The endpoint behind cursor.com's dashboard usage view; Cursor has no public usage API. */
const CURSOR_USAGE_URL = "https://cursor.com/api/dashboard/get-current-period-usage";
const CURSOR_USAGE_TIMEOUT_MS = 10_000;
const EXPIRED_NOTICE = "Cursor's sign-in has expired. Open Cursor to refresh it, then check again.";

export async function getCursorUsageStatus(input: CursorUsageStatusInput): Promise<ToolUsageInfo> {
  const auth = readCursorAuthState(input.stateDbPath);
  if (!auth) {
    return createToolUsageInfo({
      status: "unavailable",
      title: input.title,
      notice: "Sign in to the Cursor desktop app to see Cursor usage here.",
      fetchedAt: input.nowIso()
    });
  }
  const base = { title: input.title, account: auth.email, fetchedAt: input.nowIso() };
  if (auth.expiresAtMs !== null && auth.expiresAtMs <= Date.now()) {
    return createToolUsageInfo({ ...base, status: "unavailable", notice: EXPIRED_NOTICE });
  }

  try {
    const response = await fetch(CURSOR_USAGE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://cursor.com",
        // The dashboard authenticates with the WorkOS session cookie: `<userId>::<accessToken>`.
        cookie: `WorkosCursorSessionToken=${auth.userId}%3A%3A${auth.accessToken}`
      },
      body: "{}",
      signal: AbortSignal.timeout(CURSOR_USAGE_TIMEOUT_MS)
    });
    if (response.status === 401 || response.status === 403) {
      return createToolUsageInfo({ ...base, status: "unavailable", notice: EXPIRED_NOTICE });
    }
    if (!response.ok) {
      return createToolUsageInfo({ ...base, status: "error", notice: `Cursor usage request failed (HTTP ${response.status}).` });
    }

    const usage = parseCursorPeriodUsage(await response.json());
    if (!usage) {
      return createToolUsageInfo({ ...base, status: "available", notice: "Cursor did not report plan usage." });
    }
    return createToolUsageInfo({
      ...base,
      status: "available",
      windows: buildCursorUsageWindows(usage, new Date()),
      details: buildCursorUsageDetails(usage, auth.membershipType)
    });
  } catch (error: unknown) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timed out" : "could not be reached";
    return createToolUsageInfo({ ...base, status: "error", notice: `Cursor usage ${reason}.` });
  }
}
