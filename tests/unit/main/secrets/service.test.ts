import assert from "node:assert/strict";
import test from "node:test";
import { origin, secretsFixture } from "./fixture";

const live = new AbortController().signal;
const ask = { name: "API_TOKEN", purpose: "Deploys", scope: "workspace" as const, multiline: false };
const run = { command: "deploy --token \"$API_TOKEN\"", secrets: ["API_TOKEN"], timeoutMs: 1000, cwd: "/w" };

test("request_secret waits for the user's dialog, stores what they enter and reports only that it was saved", async () => {
  const f = secretsFixture();
  const pending = f.service.request(ask, origin({ conversationIds: ["thread", "parent"] }), live);
  const prompt = await f.nextPrompt();
  assert.deepEqual(prompt, { kind: "input", id: "prompt1", createdAt: "2026-11-18T00:00:00.000Z", conversationIds: ["thread", "parent"], requester: "Nora",
    projectId: "w", workspaceName: "Web", name: "API_TOKEN", purpose: "Deploys", scope: "workspace", multiline: false, replaces: false });
  f.service.answer({ kind: "save", promptId: prompt.id, value: "s3cr3t-value" });
  assert.equal(await pending, "saved");
  assert.deepEqual(f.service.pending(), []);
  assert.equal(f.store.values(["API_TOKEN"], "w").get("API_TOKEN"), "s3cr3t-value");
  // Nothing the window is pushed ever contains the value.
  assert.doesNotMatch(JSON.stringify(f.changes), /s3cr3t-value/);
  const again = f.service.request(ask, origin(), live);
  const replacement = await f.nextPrompt();
  assert.equal(replacement.kind === "input" && replacement.replaces, true);
  f.service.answer({ kind: "decline", promptId: "prompt2" });
  assert.equal(await again, "declined");
});

test("a save the keychain refuses leaves the prompt open so the user can retry", async () => {
  const f = secretsFixture();
  const pending = f.service.request(ask, origin(), live);
  const prompt = await f.nextPrompt();
  f.codec.locked = true;
  assert.throws(() => f.service.answer({ kind: "save", promptId: prompt.id, value: "v" }), /locked/);
  assert.equal(f.service.pending().length, 1);
  f.codec.locked = false;
  f.service.answer({ kind: "save", promptId: prompt.id, value: "v" });
  assert.equal(await pending, "saved");
  assert.throws(() => f.service.answer({ kind: "decline", promptId: prompt.id }), /no longer waiting/);
});

test("a prompt lapses when unanswered or when the runtime abandons the call", async () => {
  const f = secretsFixture({ timeoutMs: 20 });
  assert.equal(await f.service.request(ask, origin(), live), "unanswered");
  const abandoned = new AbortController();
  const pending = secretsFixture().service.request(ask, origin(), abandoned.signal);
  abandoned.abort();
  assert.equal(await pending, "unanswered");
  assert.deepEqual(f.service.pending(), []);
});

test("run_with_secrets asks before each command, passes secrets as environment variables and redacts the output", async () => {
  const f = secretsFixture();
  f.store.save({ name: "API_TOKEN", purpose: "Deploys", projectId: "w", value: "s3cr3t-value" });
  f.state.result = { exitCode: 0, output: "token=s3cr3t-value ok", timedOut: false };
  const pending = f.service.run(run, origin(), live);
  const prompt = await f.nextPrompt();
  assert.deepEqual([prompt.kind, prompt.kind === "use" && prompt.command, prompt.kind === "use" && prompt.secrets], ["use", run.command, ["API_TOKEN"]]);
  assert.equal(f.commands.length, 0);
  assert.throws(() => f.service.answer({ kind: "save", promptId: prompt.id, value: "x" }), /does not fit/);
  f.service.answer({ kind: "allow", promptId: prompt.id, remember: false });
  assert.deepEqual(await pending, { kind: "ran", exitCode: 0, timedOut: false, output: "token=[API_TOKEN redacted] ok" });
  assert.deepEqual([f.commands[0]?.cwd, f.commands[0]?.env], ["/w", { API_TOKEN: "s3cr3t-value" }]);
  // Allowing once does not carry over: the next command asks again, and a refusal runs nothing.
  const second = f.service.run(run, origin(), live);
  f.service.answer({ kind: "decline", promptId: (await f.nextPrompt()).id });
  assert.deepEqual(await second, { kind: "declined" });
  assert.equal(f.commands.length, 1);
});

test("allowing for the thread skips later prompts for those secrets in that thread only", async () => {
  const f = secretsFixture();
  f.store.save({ name: "API_TOKEN", purpose: "Deploys", projectId: "w", value: "v1" });
  f.store.save({ name: "OTHER", purpose: "Deploys", projectId: null, value: "v2" });
  const first = f.service.run(run, origin(), live);
  f.service.answer({ kind: "allow", promptId: (await f.nextPrompt()).id, remember: true });
  await first;
  assert.equal((await f.service.run(run, origin(), live)).kind, "ran");
  assert.deepEqual(f.service.pending(), []);
  const wider = f.service.run({ ...run, secrets: ["API_TOKEN", "OTHER"] }, origin(), live);
  f.service.answer({ kind: "decline", promptId: (await f.nextPrompt()).id });
  assert.equal((await wider).kind, "declined");
  const elsewhere = f.service.run(run, origin({ conversationId: "another", conversationIds: ["another"] }), live);
  f.service.answer({ kind: "decline", promptId: (await f.nextPrompt()).id });
  assert.equal((await elsewhere).kind, "declined");
});

test("a command naming an unsaved secret fails before the user is asked anything", async () => {
  const f = secretsFixture();
  await assert.rejects(f.service.run(run, origin(), live), /No saved secret is named API_TOKEN/);
  assert.deepEqual(f.service.pending(), []);
});

test("Settings lists, saves and deletes secrets without a value ever coming back, and hears about every change", async () => {
  const f = secretsFixture();
  f.service.save({ name: "API_TOKEN", projectId: null, purpose: "Deploys", value: "s3cr3t-value" });
  assert.deepEqual(f.service.vault(), [{ name: "API_TOKEN", projectId: null, purpose: "Deploys", updatedAt: "2026-11-18T00:00:00.000Z" }]);
  assert.deepEqual(f.service.list("w").map((secret) => [secret.name, secret.scope]), [["API_TOKEN", "everywhere"]]);
  // A thread's secure dialog reaches the same list.
  const pending = f.service.request({ ...ask, name: "DB_URL" }, origin(), live);
  f.service.answer({ kind: "save", promptId: (await f.nextPrompt()).id, value: "postgres://secret" });
  await pending;
  assert.deepEqual(f.service.vault().map((secret) => [secret.name, secret.projectId]), [["API_TOKEN", null], ["DB_URL", "w"]]);
  assert.equal(f.service.remove({ name: "API_TOKEN", projectId: null }), true);
  assert.deepEqual(f.vaultChanges.map((secrets) => secrets.map((secret) => secret.name)), [["API_TOKEN"], ["API_TOKEN", "DB_URL"], ["DB_URL"]]);
  assert.doesNotMatch(JSON.stringify(f.vaultChanges), /s3cr3t-value|postgres/);
});
