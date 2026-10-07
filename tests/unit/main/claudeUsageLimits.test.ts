import { buildClaudePlanDetail, buildClaudeUsageDetails } from "@main/agent-usage/claudeUsageDetails";
import { parseClaudeOAuthCredentials } from "@main/agent-usage/claudeOAuthCredentials";
import { resolveClaudeConfigDir } from "@main/agent-usage/claudeConfigDir";
import { buildClaudeUsageWindows, parseClaudeUsageLimits } from "@main/agent-usage/claudeUsageLimits";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("parseClaudeUsageLimits reads the session window from a real usage response", () => {
  // Trimmed from a live /api/oauth/usage response for a plan without a weekly limit.
  const limits = parseClaudeUsageLimits({
    five_hour: { utilization: 10.0, resets_at: "2026-10-08T02:20:00.354390+00:00" },
    seven_day: null,
    seven_day_opus: null,
    seven_day_sonnet: null,
    limits: [
      {
        kind: "session",
        group: "session",
        percent: 10,
        severity: "normal",
        resets_at: "2026-10-08T02:20:00.354390+00:00",
        scope: null,
        is_active: true
      }
    ]
  });

  assert.deepEqual(limits, [
    { kind: "session", scopeLabel: null, percentUsed: 10, resetsAt: "2026-10-08T02:20:00.354390+00:00", severity: "normal" }
  ]);
});

test("parseClaudeUsageLimits reads weekly_all and weekly_scoped limits", () => {
  const limits = parseClaudeUsageLimits({
    limits: [
      { kind: "weekly_all", percent: 15, resets_at: "2026-10-12T20:00:00Z", scope: null },
      { kind: "weekly_scoped", percent: 39, resets_at: null, scope: { model: { display_name: "Sonnet" } } }
    ]
  });

  assert.deepEqual(limits, [
    { kind: "weekly", scopeLabel: null, percentUsed: 15, resetsAt: "2026-10-12T20:00:00Z", severity: null },
    { kind: "weekly", scopeLabel: "Sonnet", percentUsed: 39, resetsAt: null, severity: null }
  ]);
});

test("parseClaudeUsageLimits ignores payloads without a limits array", () => {
  assert.deepEqual(parseClaudeUsageLimits(null), []);
  assert.deepEqual(parseClaudeUsageLimits({ limits: "nope" }), []);
});

test("buildClaudeUsageWindows orders session, all-models weekly, then scoped weekly windows", () => {
  const windows = buildClaudeUsageWindows(
    [
      { kind: "weekly", scopeLabel: "Sonnet", percentUsed: 39, resetsAt: null, severity: null },
      { kind: "weekly", scopeLabel: null, percentUsed: 15, resetsAt: null, severity: null },
      { kind: "session", scopeLabel: null, percentUsed: 23.4, resetsAt: "2026-10-07T22:00:00Z", severity: "normal" }
    ],
    new Date("2026-10-07T20:00:00Z")
  );

  assert.deepEqual(
    windows.map(({ id, label, shortLabel, percentLeft }) => ({ id, label, shortLabel, percentLeft })),
    [
      { id: "session", label: "Session", shortLabel: "S", percentLeft: 77 },
      { id: "weekly", label: "Weekly", shortLabel: "W", percentLeft: 85 },
      { id: "weekly:Sonnet", label: "Weekly · Sonnet", shortLabel: "W", percentLeft: 61 }
    ]
  );
  assert.ok(windows[0].resetsLabel);
  assert.equal(windows[1].resetsLabel, null);
});

test("parseClaudeOAuthCredentials reads Claude Code's stored subscription token", () => {
  assert.deepEqual(
    parseClaudeOAuthCredentials(JSON.stringify({
      claudeAiOauth: { accessToken: "test-token", refreshToken: "test-refresh", expiresAt: 1770412938485, subscriptionType: "max" }
    })),
    { accessToken: "test-token", expiresAtMs: 1770412938485, subscriptionType: "max" }
  );
  assert.equal(parseClaudeOAuthCredentials("{}"), null);
  assert.equal(parseClaudeOAuthCredentials("not json"), null);
});

test("resolveClaudeConfigDir honors CLAUDE_CONFIG_DIR and defaults to ~/.claude", () => {
  assert.equal(resolveClaudeConfigDir({ CLAUDE_CONFIG_DIR: "/tmp/claude-alt" }), "/tmp/claude-alt");
  assert.equal(resolveClaudeConfigDir({}), path.join(os.homedir(), ".claude"));
});

test("buildClaudeUsageDetails reports credits, extra usage, locks, and non-normal severities", () => {
  const limits = parseClaudeUsageLimits({
    limits: [
      { kind: "session", percent: 92, severity: "warning", resets_at: null, scope: null },
      { kind: "weekly_all", percent: 20, severity: "normal", resets_at: null, scope: null }
    ]
  });
  const details = buildClaudeUsageDetails(
    {
      five_hour: { utilization: 92, locked_reason: null },
      spend: { used: { amount_minor: 1250, currency: "USD", exponent: 2 }, limit: null, enabled: true },
      extra_usage: { is_enabled: true, monthly_limit: 100000, used_credits: 500, currency: "USD", decimal_places: 2 }
    },
    limits
  );

  assert.deepEqual(details.map((detail) => detail.label), ["Session", "Credits", "Extra usage"]);
  assert.equal(details[0].value, "Severity: warning");
  assert.match(details[1].value, /12\.50 used$/);
  assert.match(details[2].value, /5\.00 of .*1,000\.00 this month$/);
});

test("buildClaudeUsageDetails is empty for the real response with nothing extra enabled", () => {
  const payload = {
    five_hour: { utilization: 10.0, locked_reason: null },
    extra_usage: { is_enabled: false, monthly_limit: null, used_credits: null },
    spend: { used: { amount_minor: 0, currency: "USD", exponent: 2 }, limit: null, enabled: false },
    limits: [{ kind: "session", percent: 10, severity: "normal", resets_at: null, scope: null }]
  };
  assert.deepEqual(buildClaudeUsageDetails(payload, parseClaudeUsageLimits(payload)), []);
  assert.deepEqual(buildClaudePlanDetail("max"), [{ label: "Plan", value: "Max" }]);
});
