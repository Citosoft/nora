import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRemoteStateStore } from "@main/remote-access/store";
import { openRemoteAuditLog } from "@main/remote-access/auditLog";

const codec = { encrypt: (value: string) => `encrypted:${value}`, decrypt: (value: string) => value.slice(10) };

test("device state keeps a stable installation and writes atomic private snapshots", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "nora-remote-store-")); t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, "remote.json");
  let id = 0;
  const store = createRemoteStateStore({ path: file, codec, name: "Desktop", nextId: () => `installation-${++id}-123456` });
  const first = await store.load(); assert.equal(first.enabled, false);
  await store.save(first);
  assert.equal((await store.load()).installationId, first.installationId);
  await Promise.all([store.save({ ...first, name: "Earlier" }), store.save({ ...first, name: "Latest" })]);
  assert.equal((await store.load()).name, "Latest");
  if (process.platform !== "win32") assert.equal((await stat(file)).mode & 0o777, 0o600);
  await writeFile(file, "corrupt existing registration");
  await assert.rejects(store.load(), /preserved/);
  assert.equal(await readFile(file, "utf8"), "corrupt existing registration");
});

test("audit log validates entries, retains metadata only and returns newest first", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "nora-remote-audit-")); t.after(() => rm(directory, { recursive: true, force: true }));
  const audit = openRemoteAuditLog(path.join(directory, "audit.sqlite")); t.after(() => audit.close());
  for (const action of ["send-message", "cancel-task"] as const) audit.record({ at: "2026-11-16T10:00:00Z", action, conversationId: "c", targetId: "r", outcome: "accepted", code: null, userId: "owner", sessionId: "session" });
  assert.deepEqual((await audit.activity(1)).map((entry) => entry.action), ["cancel-task"]);
  assert.equal((await audit.activity(200)).length, 2);
});
