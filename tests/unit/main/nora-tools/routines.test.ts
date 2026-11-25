import assert from "node:assert/strict";
import test from "node:test";
import { describeRoutineSchedule, formatRoutineList, toRoutineInfo } from "@main/nora-tools/operations/routines";
import type { NoraRoutineStore } from "@main/types/nora-tools/operations.types";
import type { Routine, RoutineInput } from "@shared/types/bots/routines.types";
import { snapshotBot } from "@shared/bots/snapshot";
import { bot } from "../../shared/bots/fixtures";
import { conversation, noraFixture, workspace } from "./fixture";

function routine(partial: Partial<Routine> & Pick<Routine, "id" | "name">): Routine {
  return {
    botId: "ada",
    instruction: "Summarise the inbox.",
    active: true,
    timezone: "UTC",
    schedule: { kind: "daily", time: "09:00" },
    workspaceId: "w",
    runIn: "thread",
    missedPolicy: "skip",
    nextRunAt: "2026-11-26T09:00:00.000Z",
    threadId: null,
    createdAt: "2026-11-25T00:00:00.000Z",
    updatedAt: "2026-11-25T00:00:00.000Z",
    ...partial
  };
}

test("describeRoutineSchedule covers each schedule kind", () => {
  assert.equal(describeRoutineSchedule({ kind: "daily", time: "09:00" }), "daily at 09:00");
  assert.equal(describeRoutineSchedule({ kind: "weekdays", time: "08:30" }), "weekdays at 08:30");
  assert.equal(describeRoutineSchedule({ kind: "weekly", weekday: 1, time: "10:00" }), "weekly on weekday 1 at 10:00");
  assert.equal(describeRoutineSchedule({ kind: "custom", expression: "0 9 * * 1" }), "cron 0 9 * * 1");
});

test("formatRoutineList summarises routines for the model", () => {
  assert.match(formatRoutineList([toRoutineInfo(routine({ id: "r1", name: "Morning" }))]), /Morning \(id r1; active; daily at 09:00/);
  assert.equal(formatRoutineList([]), "This bot has no routines yet.");
});

test("routine operations create, update, list and remove through the store", () => {
  const rows: Routine[] = [];
  let sequence = 0;
  const store: NoraRoutineStore = {
    list(botId) {
      return { routines: rows.filter((entry) => entry.botId === botId), runs: [] };
    },
    create(input: RoutineInput) {
      const created = routine({ id: `r${++sequence}`, name: input.name, botId: input.botId, instruction: input.instruction,
        active: input.active, timezone: input.timezone, schedule: input.schedule, workspaceId: input.workspaceId,
        runIn: input.runIn, missedPolicy: input.missedPolicy, nextRunAt: input.active ? "2026-11-26T09:00:00.000Z" : null });
      rows.push(created);
      return created;
    },
    update(id, input) {
      const index = rows.findIndex((entry) => entry.id === id);
      if (index < 0) throw new Error("missing");
      const next = { ...rows[index], ...input, id, updatedAt: "2026-11-25T01:00:00.000Z",
        nextRunAt: input.active ? "2026-11-27T10:00:00.000Z" : null };
      rows[index] = next;
      return next;
    },
    remove(id) {
      const index = rows.findIndex((entry) => entry.id === id);
      if (index < 0) throw new Error("missing");
      rows.splice(index, 1);
    }
  };
  const f = noraFixture({ routines: store });
  const context = { conversation: conversation("plain", { workspace }), audience: "nora" as const };
  const created = f.deps.routines.create({
    botId: "ada",
    name: "Morning",
    instruction: "Brief me.",
    schedule: { kind: "daily", time: "09:00" }
  }, context);
  assert.equal(created.id, "r1");
  const updated = f.deps.routines.update({
    id: "r1",
    botId: "ada",
    schedule: { kind: "weekdays", time: "08:30" },
    active: false
  }, context);
  assert.equal(updated.schedule, "weekdays at 08:30");
  assert.equal(updated.active, false);
  assert.equal(f.deps.routines.list("ada", context).length, 1);
  const removed = f.deps.routines.remove("r1", "ada", context);
  assert.equal(removed.name, "Morning");
  assert.equal(f.deps.routines.list("ada", context).length, 0);
});

test("a bot thread lists its own routines when bot_id is omitted", () => {
  const store: NoraRoutineStore = {
    list(botId) {
      assert.equal(botId, "ada");
      return { routines: [routine({ id: "r1", name: "Own" })], runs: [] };
    },
    create() { throw new Error("unused"); },
    update() { throw new Error("unused"); },
    remove() { throw new Error("unused"); }
  };
  const f = noraFixture({ routines: store });
  const context = { conversation: conversation("bot", { bot: snapshotBot(bot("ada")) }), audience: "bot" as const };
  assert.equal(f.deps.routines.list(undefined, context)[0]?.name, "Own");
});
