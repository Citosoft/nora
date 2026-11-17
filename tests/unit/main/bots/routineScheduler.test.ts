import assert from "node:assert/strict";
import test from "node:test";
import { openRoutineStore } from "@main/bots/routines/store";
import { createRoutineScheduler } from "@main/bots/routines/scheduler";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { RoutineInput } from "@shared/types/bots/routines.types";
import type { RoutineStore } from "@main/types/bots/routines.types";
import { bot } from "../../shared/bots/fixtures";
import { fakeHost } from "./fakeHost";

const ada = bot("ada");
const ref: WorkspaceRef = { projectId: "app", environmentId: "local", checkoutId: "app", path: "/app", branch: "main", access: "read" };
const daily = (overrides: Partial<RoutineInput> = {}): RoutineInput => ({ botId: "ada", name: "Morning", instruction: "Summarise the inbox.", active: true,
  timezone: "UTC", schedule: { kind: "daily", time: "09:00" }, workspaceId: "app", runIn: "thread", missedPolicy: "skip", ...overrides });

function setup(start: string, options: { store?: RoutineStore; reply?: (instruction: string) => string | null | Error } = {}) {
  let now = Date.parse(start);
  let sequence = 0;
  const fake = fakeHost([ada], (_botId, instruction) => options.reply ? options.reply(instruction) : "Done.");
  const store = options.store ?? openRoutineStore(":memory:");
  const timers: { callback: () => void; at: number }[] = [];
  const changed: string[] = [];
  const errors: unknown[] = [];
  const scheduler = createRoutineScheduler({ store, host: fake.host, nextId: () => `id${++sequence}`, clock: () => now,
    bot: (workspaceId, botId) => workspaceId === "app" && botId === "ada" ? ada : null,
    workspaces: () => [{ id: "app", name: "App", workspace: ref }],
    schedule: (callback, delayMs) => { const timer = { callback, at: now + delayMs }; timers.push(timer); return () => { timers.splice(timers.indexOf(timer), 1); }; },
    // Runs that never answer time out quickly so a pending run cannot keep the test process alive.
    runTimeoutMs: 200, onChanged: (botId) => changed.push(botId), onError: (error) => errors.push(error) });
  return { fake, store, scheduler, timers, changed, errors, advance(to: string) { now = Date.parse(to); }, get now() { return now; } };
}

test("a new routine is scheduled for its next occurrence and runs in its own reusable thread", async () => {
  const env = setup("2026-11-15T08:00:00.000Z");
  env.scheduler.start();
  const routine = env.scheduler.create(daily());
  assert.equal(routine.nextRunAt, "2026-11-15T09:00:00.000Z");
  assert.ok(env.timers.some((timer) => timer.at === Date.parse("2026-11-15T09:00:00.000Z")));

  env.advance("2026-11-15T09:00:05.000Z");
  env.scheduler.processDue();
  await env.scheduler.idle();
  const [run] = env.scheduler.list("ada").runs;
  assert.equal(run.status, "succeeded");
  assert.equal(run.kind, "scheduled");
  assert.equal(run.scheduledFor, "2026-11-15T09:00:00.000Z");
  const saved = env.store.get(routine.id);
  assert.equal(saved?.nextRunAt, "2026-11-16T09:00:00.000Z");
  assert.ok(saved?.threadId);
  assert.equal(run.conversationId, saved?.threadId);
  const submit = env.fake.commands.find((command) => command.kind === "submit");
  assert.match(submit?.kind === "submit" ? submit.instruction : "", /routine "Morning", scheduled for .*\n\nSummarise the inbox\./);

  env.advance("2026-11-16T09:00:01.000Z");
  env.scheduler.processDue();
  await env.scheduler.idle();
  assert.equal(env.fake.commands.filter((command) => command.kind === "create").length, 1, "the routine thread is reused");
  assert.ok(env.changed.every((id) => id === "ada"));
  assert.deepEqual(env.errors, []);
});

test("chat routines post into the bot's direct chat, creating it once", async () => {
  const env = setup("2026-11-15T08:00:00.000Z");
  env.scheduler.start();
  const routine = env.scheduler.create(daily({ runIn: "chat" }));
  env.scheduler.runNow(routine.id);
  await env.scheduler.idle();
  const create = env.fake.commands.find((command) => command.kind === "create");
  assert.deepEqual(create?.kind === "create" ? create.direct : null, { botId: "ada", workspaceId: "app" });
  const submit = env.fake.commands.find((command) => command.kind === "submit");
  assert.equal(submit?.kind === "submit" ? submit.workspaceId : null, "app", "chat runs are pinned to the routine's workspace");
  assert.equal(env.scheduler.list("ada").runs[0].kind, "manual");
  assert.equal(env.store.get(routine.id)?.nextRunAt, "2026-11-15T09:00:00.000Z", "run now leaves the schedule alone");
});

test("occurrences missed while Nora was closed are summarised on one skipped run", () => {
  const store = openRoutineStore(":memory:");
  const first = setup("2026-11-10T08:00:00.000Z", { store });
  first.scheduler.start();
  const routine = first.scheduler.create(daily());
  first.scheduler.stop();

  const second = setup("2026-11-15T12:00:00.000Z", { store });
  second.scheduler.start();
  const [run] = second.scheduler.list("ada").runs;
  assert.equal(run.status, "cancelled");
  assert.deepEqual(run.missed, { count: 6, until: "2026-11-15T09:00:00.000Z" });
  assert.equal(store.get(routine.id)?.nextRunAt, "2026-11-16T09:00:00.000Z");
});

test("run-once runs the newest missed occurrence when Nora opens", async () => {
  const store = openRoutineStore(":memory:");
  const first = setup("2026-11-10T08:00:00.000Z", { store });
  first.scheduler.start();
  const routine = first.scheduler.create(daily({ missedPolicy: "run-once" }));
  first.scheduler.stop();

  const second = setup("2026-11-12T12:00:00.000Z", { store });
  second.scheduler.start();
  second.timers.find((timer) => timer.at === second.now)?.callback();
  await second.scheduler.idle();
  const runs = second.scheduler.list("ada").runs;
  assert.deepEqual(runs.map((run) => [run.status, run.scheduledFor]), [["succeeded", "2026-11-12T09:00:00.000Z"], ["cancelled", "2026-11-10T09:00:00.000Z"]]);
  assert.deepEqual(runs[1].missed, { count: 2, until: "2026-11-11T09:00:00.000Z" });
  assert.equal(store.get(routine.id)?.nextRunAt, "2026-11-13T09:00:00.000Z");
});

test("runs left unfinished by a previous session are marked interrupted", () => {
  const store = openRoutineStore(":memory:");
  const first = setup("2026-11-15T08:00:00.000Z", { store, reply: () => null });
  first.scheduler.start();
  first.scheduler.runNow(first.scheduler.create(daily()).id);
  first.scheduler.stop();
  const second = setup("2026-11-15T08:05:00.000Z", { store });
  second.scheduler.start();
  assert.equal(second.scheduler.list("ada").runs[0].status, "interrupted");
});

test("an occurrence is skipped while the previous run is still going", () => {
  const env = setup("2026-11-15T08:00:00.000Z", { reply: () => null });
  env.scheduler.start();
  const routine = env.scheduler.create(daily({ schedule: { kind: "interval", amount: 1, unit: "hours", anchorAt: "2026-11-15T08:00:00.000Z" } }));
  env.advance("2026-11-15T09:00:00.000Z");
  env.scheduler.processDue();
  env.advance("2026-11-15T10:00:00.000Z");
  env.scheduler.processDue();
  const runs = env.scheduler.list("ada").runs;
  assert.equal(runs[0].status, "cancelled");
  assert.match(runs[0].error ?? "", /previous run/);
  assert.throws(() => env.scheduler.runNow(routine.id), /already running/);
});

test("one-time routines pause after running, and pausing clears the next run", async () => {
  const env = setup("2026-11-15T08:00:00.000Z");
  env.scheduler.start();
  const once = env.scheduler.create(daily({ schedule: { kind: "once", date: "2026-11-15", time: "10:00" }, missedPolicy: "run-once" }));
  env.advance("2026-11-15T10:00:00.000Z");
  env.scheduler.processDue();
  await env.scheduler.idle();
  assert.deepEqual([env.store.get(once.id)?.active, env.store.get(once.id)?.nextRunAt], [false, null]);
  assert.throws(() => env.scheduler.setActive(once.id, true), /future/);

  const routine = env.scheduler.create(daily());
  assert.equal(env.scheduler.setActive(routine.id, false).nextRunAt, null);
  assert.equal(env.scheduler.setActive(routine.id, true).nextRunAt, "2026-11-16T09:00:00.000Z");
});

test("routines are refused for unavailable bots, closed workspaces and past one-off times", () => {
  const env = setup("2026-11-15T08:00:00.000Z");
  assert.throws(() => env.scheduler.create(daily({ botId: "rex" })), /not available/);
  assert.throws(() => env.scheduler.create(daily({ workspaceId: "site" })), /open in Nora/);
  assert.throws(() => env.scheduler.create(daily({ schedule: { kind: "once", date: "2026-11-14", time: "09:00" } })), /future/);
});

test("a failed run records the provider's message, and deleting a routine removes its history", async () => {
  const env = setup("2026-11-15T08:00:00.000Z", { reply: () => new Error("Usage limit reached") });
  env.scheduler.start();
  const routine = env.scheduler.create(daily());
  env.scheduler.runNow(routine.id);
  await env.scheduler.idle();
  assert.deepEqual([env.scheduler.list("ada").runs[0].status, env.scheduler.list("ada").runs[0].error], ["failed", "Usage limit reached"]);
  env.scheduler.remove(routine.id);
  assert.deepEqual(env.scheduler.list("ada"), { routines: [], runs: [] });
});
