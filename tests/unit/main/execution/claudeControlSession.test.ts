import assert from "node:assert/strict";
import test from "node:test";
import { createClaudeControlSessions } from "@main/providers/claude/controlSession";
import type { ClaudeControlSessionOpener } from "@main/types/execution/claude.types";

interface FakeSession { id: number }

function fakeRuntime() {
  const opened: string[] = [];
  let closed = 0;
  const open: ClaudeControlSessionOpener<FakeSession> = (_runtime, cwd, model) => {
    opened.push(`${cwd}:${model ?? ""}`);
    return { session: { id: opened.length }, close: async () => { closed++; } };
  };
  return { run: createClaudeControlSessions(open), opened, closed: () => closed };
}

const runtime = { executablePath: "/bin/claude" };
const deferred = <T>() => {
  let resolve = (_value: T): void => {};
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

test("overlapping reads for one checkout share a single runtime and close it after the last reader", async () => {
  const { run, opened, closed } = fakeRuntime();
  const skills = deferred<string>();
  const first = run(runtime, "/repo", async (session) => `models:${session.id}`);
  const second = run(runtime, "/repo", async (session) => `${await skills.promise}:${session.id}`);
  assert.equal(await first, "models:1");
  assert.equal(closed(), 0, "the session stays open while another reader is using it");
  skills.resolve("skills");
  assert.equal(await second, "skills:1");
  assert.deepEqual(opened, ["/repo:"]);
  assert.equal(closed(), 1);
});

test("different checkouts and models never share a session, and finished sessions are not reused", async () => {
  const { run, opened } = fakeRuntime();
  await Promise.all([run(runtime, "/repo", async () => 1), run(runtime, "/other", async () => 2), run(runtime, "/repo", async () => 3, "opus")]);
  await run(runtime, "/repo", async () => 4);
  assert.deepEqual(opened, ["/repo:", "/other:", "/repo:opus", "/repo:"]);
});

test("a timed-out runtime is not handed to later readers", async () => {
  const { run, opened, closed } = fakeRuntime();
  const hung = deferred<string>();
  const slow = { ...runtime, discoveryTimeoutMs: 5 };
  const stuck = run(slow, "/repo", () => hung.promise);
  await assert.rejects(stuck, /timed out/);
  const fresh = run(slow, "/repo", async (session) => session.id);
  assert.equal(await fresh, 2);
  assert.deepEqual(opened, ["/repo:", "/repo:"]);
  assert.equal(closed(), 2);
});
