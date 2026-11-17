import assert from "node:assert/strict";
import test from "node:test";
import { ConversationNaming } from "@main/execution/conversationNaming";
import { fixture } from "./fixture";
import { DEFAULT_THREAD_PREFERENCES } from "@shared/personalization/threads";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test("disabling automatic titles avoids generation for newly submitted threads", async (t) => {
  const { ExecutionHost } = await import("@main/execution/host");
  const { ProviderRegistry } = await import("@main/execution/providerRegistry");
  const { ProviderDouble } = await import("./providerDouble");
  const { workspaceAuthority } = await import("./fixture");
  const { randomUUID } = await import("node:crypto");
  const f = fixture(t); f.create();
  f.engine.applyGeneratedTitle("conversation", "conversation", "Opening prompt");
  const providers = new ProviderRegistry(); providers.register(new ProviderDouble());
  let calls = 0;
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority,
    owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => true, now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID,
    onFailure: () => assert.fail("host failed"), threadPreferences: () => ({ ...DEFAULT_THREAD_PREFERENCES, automaticTitles: false }),
    generateThreadName: async () => { calls++; return "Generated title"; } });
  host.start();
  try {
    await host.execute({ kind: "submit", commandId: "send", conversationId: "conversation", runId: "run", instruction: "Opening prompt" });
    await flush();
    assert.equal(calls, 0); assert.equal(f.snapshot().conversation.title, "Opening prompt");
  } finally { await host.shutdown(); }
});

test("naming enriches prompt titles without executing a custom title", async () => {
  const applied: string[] = [];
  const naming = new ConversationNaming({ generate: async () => "Generated name", apply: (_id, _expected, title) => { applied.push(title); } });
  naming.start("c", "Opening prompt", "Opening prompt");
  naming.start("task", "Deliberate task title", "Opening prompt");
  await flush();
  assert.deepEqual(applied, ["Generated name"]);
  naming.close();
});

test("naming failure retains the original title and closing cancels outstanding generation", async () => {
  const rejected = new ConversationNaming({ generate: async () => { throw new Error("No key"); }, apply: () => assert.fail("Must retain title") });
  rejected.start("c", "Prompt", "Prompt");
  await flush();
  rejected.close();
  let resolveName = (_name: string): void => {};
  let signal: AbortSignal | undefined;
  const pending = new ConversationNaming({ generate: (_prompt, nextSignal) => {
    signal = nextSignal;
    return new Promise<string>((resolve) => { resolveName = resolve; });
  }, apply: () => assert.fail("Must not rename after shutdown") });
  pending.start("c", "Prompt", "Prompt");
  pending.close();
  assert.equal(signal?.aborted, true);
  resolveName("Late result");
  await flush();
});

test("generated titles persist and publish normally, with conditional updates protecting renamed and archived threads", (t) => {
  const f = fixture(t);
  f.create();
  const before = f.store.cursor();
  f.engine.applyGeneratedTitle("conversation", "conversation", "Runtime generation");
  assert.equal(f.snapshot().conversation.title, "Runtime generation");
  assert.equal(f.store.events(before, 10)[0].payload.kind, "conversation");
  f.engine.applyGeneratedTitle("conversation", "conversation", "Stale title");
  assert.equal(f.snapshot().conversation.title, "Runtime generation");
  f.restart();
  assert.equal(f.snapshot().conversation.title, "Runtime generation");
  f.command({ kind: "archive", commandId: "archive", conversationId: "conversation" });
  f.engine.applyGeneratedTitle("conversation", "Runtime generation", "Late title");
  assert.equal(f.snapshot().conversation.title, "Runtime generation");
});

test("host names only the first accepted instruction without delaying acceptance or repeating retries", async (t) => {
  const { ExecutionHost } = await import("@main/execution/host");
  const { ProviderRegistry } = await import("@main/execution/providerRegistry");
  const { ProviderDouble } = await import("./providerDouble");
  const { workspaceAuthority } = await import("./fixture");
  const { randomUUID } = await import("node:crypto");
  const f = fixture(t);
  const provider = new ProviderDouble();
  const providers = new ProviderRegistry(); providers.register(provider);
  let calls = 0;
  let release = (_name: string): void => {};
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority,
    owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => true,
    now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID, onFailure: () => assert.fail("Host must remain healthy"),
    generateThreadName: async () => { calls++; return new Promise<string>((resolve) => { release = resolve; }); }
  });
  host.start();
  try {
    await host.execute({ kind: "create", commandId: "create", conversationId: "conversation", title: "Opening prompt", parentId: null,
      provider: { kind: "codex", instanceId: "account-a", model: "test", permissionPolicy: "native-default", reasoning: null },
      workspace: { environmentId: "local", projectId: "p", checkoutId: "c", path: "/test/c", branch: "main", access: "write" } });
    const submit = { kind: "submit" as const, commandId: "send", conversationId: "conversation", runId: "run", instruction: "Opening prompt" };
    const receipt = await host.execute(submit);
    assert.equal(calls, 1);
    assert.equal(host.header("conversation")?.conversation.title, "Opening prompt");
    assert.deepEqual(await host.execute(submit), receipt);
    await host.execute({ ...submit, commandId: "send-next", runId: "next", instruction: "Follow-up" });
    assert.equal(calls, 1);
    release("Generated title");
    await flush();
    assert.equal(host.header("conversation")?.conversation.title, "Generated title");
  } finally { await host.shutdown(); }
});

test("renaming retitles settled threads too, keeps last activity, and a late generated title never overwrites it", (t) => {
  const f = fixture(t);
  f.create();
  const { title: original, updatedAt } = f.snapshot().conversation;
  f.command({ kind: "rename", commandId: "rename", conversationId: "conversation", title: "Launch crew" });
  assert.deepEqual([f.snapshot().conversation.title, f.snapshot().conversation.updatedAt], ["Launch crew", updatedAt]);
  f.engine.applyGeneratedTitle("conversation", original, "Generated later");
  assert.equal(f.snapshot().conversation.title, "Launch crew");
  const before = f.store.cursor();
  f.command({ kind: "rename", commandId: "same", conversationId: "conversation", title: "Launch crew" });
  assert.equal(f.store.cursor(), before);
  f.command({ kind: "archive", commandId: "archive", conversationId: "conversation" });
  f.command({ kind: "rename", commandId: "settled", conversationId: "conversation", title: "Launch crew (done)" });
  assert.equal(f.snapshot().conversation.title, "Launch crew (done)");
});
