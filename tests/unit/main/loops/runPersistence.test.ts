import assert from "node:assert/strict";
import test from "node:test";
import { createLoopPersistence } from "@main/loops/runPersistence";
import { loopFixture, until } from "./fixture";

test("pending output writes coalesce within each group and respect intervening controls", async (t) => {
  const f = loopFixture();
  const started = await f.start();
  await until(() => f.runs.get(started.id)?.status === "completed");
  const run = { ...started, status: "running" as const };
  await f.store.saveRun(run);
  const saves = t.mock.method(f.store, "saveRun");
  const persistence = createLoopPersistence({ store: f.store, nowIso: () => run.updatedAt, notifyRunChanged() {} });
  const burst = Array.from({ length: 100 }, (_, i) => persistence.output({ ...run, outputLog: String(i) }));
  const pause = persistence.update(run, { status: "paused" });
  const last = persistence.output({ ...run, outputLog: "end" });
  await Promise.all([...burst, pause, last]);
  assert.deepEqual(saves.mock.calls.map(({ arguments: [saved] }) => [saved.outputLog, saved.status]),
    [["99", "running"], ["99", "paused"], ["end", "paused"]]);
});
