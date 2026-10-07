import { parseCliUsageLines } from "@main/agent-usage/cliUsageLines";
import { createToolUsageInfo } from "@main/agent-usage/toolUsageInfo";
import assert from "node:assert/strict";
import test from "node:test";

test("parseCliUsageLines reads Codex /status limit lines and the signed-in email", () => {
  const { windows, account } = parseCliUsageLines([
    "User: dev@example.com",
    "5h limit: [████░░] 72% left (resets 14:30)",
    "Weekly limit: [██░░░░] 40% left (resets 09:00 on 12 Oct)"
  ]);

  assert.deepEqual(windows, [
    { id: "hourly", label: "Hourly", shortLabel: "H", percentLeft: 72, resetsLabel: "14:30" },
    { id: "weekly", label: "Weekly", shortLabel: "W", percentLeft: 40, resetsLabel: "09:00 on 12 Oct" }
  ]);
  assert.equal(account, "dev@example.com");
});

test("parseCliUsageLines reports no windows for version-only output", () => {
  assert.deepEqual(parseCliUsageLines(["gemini 1.2.3"]), { windows: [], account: null });
});

test("createToolUsageInfo appends window and notice lines to the transcript", () => {
  const info = createToolUsageInfo({
    status: "available",
    title: "Usage",
    lines: ["User: dev@example.com"],
    windows: [{ id: "monthly", label: "Monthly", shortLabel: "M", percentLeft: 87, resetsLabel: "Sat 31 Oct 09:29" }],
    notice: "Heads up",
    fetchedAt: "2026-10-07T00:00:00.000Z"
  });

  assert.deepEqual(info.lines, ["User: dev@example.com", "Monthly: 87% left (resets Sat 31 Oct 09:29)", "Heads up"]);
  assert.equal(info.account, null);
  assert.equal(info.notice, "Heads up");
});
