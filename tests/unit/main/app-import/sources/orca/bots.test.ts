import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readOrcaBots } from "@main/app-import/sources/orca/bots";
import { orcaRruleSchedule } from "@main/app-import/sources/orca/rrule";
import type { AppImportEnvironment } from "@main/types/app-import/appImportSource.types";

const NINE_LONDON = Date.UTC(2026, 0, 5, 9, 30);

test("Orca repeat rules convert to Nora schedules where Nora has one", () => {
  assert.deepEqual(orcaRruleSchedule("RRULE:FREQ=DAILY;BYHOUR=9;BYMINUTE=0", NINE_LONDON, "Europe/London"), { status: "converted", schedule: { kind: "daily", time: "09:00" } });
  assert.deepEqual(orcaRruleSchedule("FREQ=DAILY", NINE_LONDON, "Europe/London"), { status: "converted", schedule: { kind: "daily", time: "09:30" } });
  assert.deepEqual(orcaRruleSchedule("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8;BYMINUTE=15", NINE_LONDON, "UTC"), { status: "converted", schedule: { kind: "weekdays", time: "08:15" } });
  assert.deepEqual(orcaRruleSchedule("FREQ=WEEKLY;BYDAY=FR;BYHOUR=17;BYMINUTE=0", NINE_LONDON, "UTC"), { status: "converted", schedule: { kind: "weekly", weekday: 5, time: "17:00" } });
  assert.deepEqual(orcaRruleSchedule("FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=7;BYMINUTE=5", NINE_LONDON, "UTC"), { status: "converted", schedule: { kind: "custom", expression: "5 7 * * 1,3" } });
  assert.deepEqual(orcaRruleSchedule("FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=6;BYMINUTE=0", NINE_LONDON, "UTC"), { status: "converted", schedule: { kind: "monthly", day: 1, time: "06:00" } });
  assert.deepEqual(orcaRruleSchedule("FREQ=HOURLY;INTERVAL=2", NINE_LONDON, "UTC"), { status: "converted", schedule: { kind: "interval", amount: 2, unit: "hours", anchorAt: new Date(NINE_LONDON).toISOString() } });
  for (const rule of ["FREQ=DAILY;COUNT=3", "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", "FREQ=YEARLY", "FREQ=DAILY;BYHOUR=9,17"]) {
    assert.equal(orcaRruleSchedule(rule, NINE_LONDON, "UTC").status, "unsupported", rule);
  }
});

test("Orca bots bring their SOUL.md, MEMORY.md and schedulable automations; event triggers stay behind", async (t) => {
  const home = await mkdtemp(path.join(os.tmpdir(), "nora-orca-bots-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  const botDir = path.join(home, ".orca", "bots", "scout");
  await mkdir(botDir, { recursive: true });
  await writeFile(path.join(botDir, "SOUL.md"), "# Scout\n\nKeeps an eye on the news and reports briefly.\n\nNever share private data.\n");
  await writeFile(path.join(botDir, "MEMORY.md"), "# Memory\n\nOne line per fact, newest first.\n\n- 2026-11-01 Prefers: short answers\n- Fact: works in London\n");
  const env: AppImportEnvironment = { homeDir: home, platform: "darwin", appDataDir: null, xdgConfigHome: null, variables: {} };
  const result = await readOrcaBots({
    bots: [{ id: "b2", name: "Writer", folder: "writer", agent: "gemini", members: [{ slackUserId: "U1" }] }, { id: "b1", name: "Scout", folder: "scout", agent: "claude", launch: { model: "opus" }, avatarColor: "#3b82f6" }],
    newerAgents: [], order: ["b1", "b2"],
    automations: [
      { name: "Morning", prompt: "Brief me", rrule: "FREQ=DAILY;BYHOUR=9;BYMINUTE=0", dtstart: NINE_LONDON, timezone: "Europe/London", bot: { botId: "b1" } },
      { name: "On PR", prompt: "Review", rrule: "FREQ=DAILY", dtstart: NINE_LONDON, timezone: "UTC", on: [{ source: "github", event: "pr_opened" }], bot: { botId: "b1" } },
      { name: "Not mine", prompt: "x", rrule: "FREQ=DAILY", dtstart: NINE_LONDON, timezone: "UTC" }
    ]
  }, env);
  assert.deepEqual(result.bots.map((bot) => bot.name), ["Scout", "Writer"], "ordered by botOrder");
  const [scout, writer] = result.bots;
  assert.ok(scout && writer);
  assert.equal(scout.role, "Keeps an eye on the news and reports briefly.");
  assert.equal(scout.instructions, "Keeps an eye on the news and reports briefly.\n\nNever share private data.");
  assert.deepEqual(scout.memory, ["2026-11-01 Prefers: short answers", "Fact: works in London"]);
  assert.deepEqual(scout.model, { provider: "claude", sourceProvider: "claude", model: "opus" });
  assert.equal(scout.avatar.palette, "blue");
  assert.deepEqual(scout.routines, [{ name: "Morning", instruction: "Brief me", schedule: { kind: "daily", time: "09:00" }, timezone: "Europe/London" }]);
  assert.deepEqual(result.skipped.map((item) => item.label), ['Scout: routine "On PR"']);
  assert.deepEqual(writer.adjustments, ["Nora can't run gemini; it will use your default model."]);
  assert.ok(!JSON.stringify(result).includes("U1"), "account links never come along");
});
