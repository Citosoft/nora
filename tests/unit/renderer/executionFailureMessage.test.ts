import assert from "node:assert/strict";
import test from "node:test";
import { executionFailureMessage } from "@/components/app/logic/executionFailureMessage";
import { usageResetTimestamp } from "@shared/conversations/usageReset";
import { codexUsageReset } from "@main/providers/codex/usageReset";

const now = new Date("2026-11-10T10:00:00Z");
const failure = { code: "usage-limit" as const, message: "Codex usage limit reached", retryable: true };

test("usage failures show a local reset date and timezone without guessing unknown resets", () => {
  const resetsAt = "2026-11-10T12:00:00Z";
  const label = new Date(resetsAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  assert.equal(executionFailureMessage({ ...failure, resetsAt }, now), `${failure.message}. Resets ${label}.`);
  assert.equal(executionFailureMessage(failure, now), `${failure.message}. Reset time unavailable.`);
  assert.match(executionFailureMessage({ ...failure, resetsAt: "2026-11-09T12:00:00Z" }, now), /reset time has passed/);
  assert.equal(executionFailureMessage({ ...failure, code: "provider" }, now), failure.message);
});

test("Codex waits for all exhausted windows and never guesses missing or stale resets", () => {
  const early = Date.parse("2026-11-10T12:00:00Z") / 1000;
  const late = early + 3600;
  assert.equal(codexUsageReset({ primary: { usedPercent: 100, resetsAt: early }, secondary: { usedPercent: 100, resetsAt: late } }, now.toISOString()), usageResetTimestamp(late));
  assert.equal(codexUsageReset({ primary: { usedPercent: 100, resetsAt: early }, secondary: { usedPercent: 100 } }, now.toISOString()), undefined);
  assert.equal(codexUsageReset({ primary: { usedPercent: 20, resetsAt: early } }, now.toISOString()), undefined);
  assert.equal(codexUsageReset({ primary: { usedPercent: 100, resetsAt: early } }, "2026-11-11T10:00:00Z"), undefined);
  for (const value of [null, undefined, NaN, Infinity, -1, 1e20]) assert.equal(usageResetTimestamp(value), undefined);
});
