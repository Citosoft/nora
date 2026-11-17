import { usageResetTimestamp } from "@shared/conversations/usageReset";
import type { CodexRateLimits } from "@main/types/execution/codex.types";

/** Both exhausted windows must reset before the account can be used again. */
export function codexUsageReset(limits: CodexRateLimits | null, now: string): string | undefined {
  const exhausted = [limits?.primary, limits?.secondary].filter((window) => window && window.usedPercent >= 100);
  if (!exhausted.length) return undefined;
  const resets = exhausted.map((window) => usageResetTimestamp(window?.resetsAt));
  if (resets.some((reset) => !reset)) return undefined;
  const latest = resets.reduce<string>((result, reset) => reset && reset > result ? reset : result, "");
  return latest > now ? latest : undefined;
}
