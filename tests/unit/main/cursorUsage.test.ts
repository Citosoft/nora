import { parseCursorAuthRows, resolveCursorStateDbPath } from "@main/agent-usage/cursorAuthState";
import { buildCursorUsageDetails, buildCursorUsageWindows, parseCursorPeriodUsage } from "@main/agent-usage/cursorUsage";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// Trimmed from a live get-current-period-usage response.
const REAL_RESPONSE = {
  billingCycleStart: "1790809751000",
  billingCycleEnd: "1793401751000",
  planUsage: {
    totalSpend: 6356,
    includedSpend: 2000,
    bonusSpend: 4356,
    limit: 2000,
    remainingBonus: false,
    autoPercentUsed: 14.124444444444444,
    apiPercentUsed: 0,
    totalPercentUsed: 13.45185185185185
  },
  spendLimitUsage: { limitType: "user" },
  enabled: true
};

test("parseCursorPeriodUsage reads plan usage percentages and the billing cycle end", () => {
  assert.deepEqual(parseCursorPeriodUsage(REAL_RESPONSE), {
    billingCycleEndMs: 1793401751000,
    totalPercentUsed: 13.45185185185185,
    autoPercentUsed: 14.124444444444444,
    apiPercentUsed: 0,
    bonusSpendCents: 4356
  });
  assert.equal(parseCursorPeriodUsage({ billingCycleEnd: "1" }), null);
});

test("buildCursorUsageWindows reports one monthly window with percent left", () => {
  const usage = parseCursorPeriodUsage(REAL_RESPONSE);
  assert.ok(usage);
  const [window] = buildCursorUsageWindows(usage, new Date(1790985113170));
  assert.equal(window.id, "monthly");
  assert.equal(window.shortLabel, "M");
  assert.equal(window.percentLeft, 87);
  assert.ok(window.resetsLabel);
});

test("buildCursorUsageDetails lists plan, usage split, and bonus usage", () => {
  const usage = parseCursorPeriodUsage(REAL_RESPONSE);
  assert.ok(usage);
  const details = buildCursorUsageDetails(usage, "pro");
  assert.deepEqual(details.slice(0, 3), [
    { label: "Plan", value: "Pro" },
    { label: "Auto + Composer", value: "14% used" },
    { label: "API models", value: "0% used" }
  ]);
  assert.equal(details[3].label, "Bonus usage");
  assert.match(details[3].value, /43\.56/);
});

test("parseCursorAuthRows derives the user id and expiry from the stored access token", () => {
  const claims = Buffer.from(JSON.stringify({ sub: "auth0|user_TEST", exp: 1796157882 })).toString("base64url");
  const token = `header.${claims}.signature`;
  const rows = [
    { key: "cursorAuth/accessToken", value: token },
    { key: "cursorAuth/cachedEmail", value: "dev@example.com" },
    { key: "cursorAuth/stripeMembershipType", value: "pro" }
  ];

  assert.deepEqual(parseCursorAuthRows(rows), {
    accessToken: token,
    userId: "user_TEST",
    expiresAtMs: 1796157882000,
    email: "dev@example.com",
    membershipType: "pro"
  });
  assert.equal(parseCursorAuthRows([]), null);
  assert.equal(parseCursorAuthRows([{ key: "cursorAuth/accessToken", value: "not-a-jwt" }]), null);
});

test("resolveCursorStateDbPath follows each platform's app data location", () => {
  const tail = path.join("Cursor", "User", "globalStorage", "state.vscdb");
  assert.equal(
    resolveCursorStateDbPath("darwin", {}),
    path.join(os.homedir(), "Library", "Application Support", tail)
  );
  assert.equal(resolveCursorStateDbPath("linux", { XDG_CONFIG_HOME: "/tmp/cfg" }), path.join("/tmp/cfg", tail));
  assert.equal(resolveCursorStateDbPath("win32", { APPDATA: "C:\\Users\\dev\\AppData\\Roaming" }), path.join("C:\\Users\\dev\\AppData\\Roaming", tail));
});
