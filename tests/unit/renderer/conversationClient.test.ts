import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createConversationClient } from "@/components/app/clients/createConversationClient";
import { ExecutionHost } from "@main/execution/host";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { createConversationBridge } from "@main/preload/createConversationBridge";
import type { ConversationBridge, ConversationCursorHint, ReadConversationResult } from "@shared/ipc/types/conversationGateway.types";
import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import { fixture, workspaceAuthority } from "../main/execution/fixture";
import { GatewayFixture, FixtureSubscriber } from "../main/execution/gatewayFixture";
import { ProviderDouble } from "../main/execution/providerDouble";
import { snapshot } from "../main/execution/checkpoints/fixture";
import { compareSnapshots } from "@main/execution/checkpoints/diff";

function deferred<T>() {
  let resolve = (_value: T): void => {};
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve: (value: T) => resolve(value) };
}
async function until(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Conversation client did not settle");
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

test("client and IPC replay more than one bounded page without gaps; closing a view keeps native work running", async (t) => {
  const f = fixture(t); f.create();
  const providers = new ProviderRegistry(); const provider = new ProviderDouble(); providers.register(provider);
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority, owner: { id: randomUUID(), processId: process.pid },
    isProcessAlive: () => true, now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID, onFailure() {} });
  host.start(); const ipc = new GatewayFixture({ resolveHost: (environmentId) => environmentId === "local" ? host : null });
  const sender = new FixtureSubscriber(1); const client = createConversationClient(ipc.bridge(sender), "local");
  const errors: Error[] = []; const seen: number[] = [];
  try {
    const header = await client.header("conversation"); assert.ok(header);
    const close = client.subscribe({ after: header.cursor, conversationId: "conversation", onEvent: (event) => seen.push(event.cursor), onError: (error) => errors.push(error) });
    for (let index = 0; index < 110; index++) await client.execute({ kind: "submit", commandId: `submit-${index}`, conversationId: "conversation", runId: `run-${index}`, instruction: "Fixture" });
    const expected = f.store.events(header.cursor, 1000, "conversation").map((event) => event.cursor);
    assert.ok(expected.length > 200);
    await until(() => seen.length === expected.length || errors.length > 0);
    assert.deepEqual(seen, expected); assert.deepEqual(errors, []);
    close(); const count = seen.length;
    await client.execute({ kind: "submit", commandId: "after-close", conversationId: "conversation", runId: "after-close", instruction: "Still running" });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(seen.length, count); assert.equal(provider.active.size, 1); assert.equal(sender.hints.size, 0);
  } finally { ipc.dispose(); await host.shutdown(); }
});

test("a hint arriving while an empty replay page is in flight cannot skip the new event", async () => {
  const empty = deferred<ReadConversationResult>();
  const event: ConversationEvent = { schemaVersion: 1, cursor: 11, id: "event-11", conversationId: "conversation", at: "2026-10-21T10:00:00.000Z",
    payload: { kind: "item", item: { kind: "milestone", id: "milestone", runId: "run", createdAt: "2026-10-21T10:00:00.000Z", text: "Activity" } } };
  let notify = (_hint: ConversationCursorHint): void => {};
  let watchId = ""; const afters: number[] = []; const seen: number[] = []; const errors: Error[] = [];
  const bridge: ConversationBridge = { async mcp() { throw new Error("Unused"); }, async account() { throw new Error("Unused"); }, async skills() { throw new Error("Unused"); },
    async execute() { throw new Error("Unused"); },
    async read(request) {
      assert.ok(request.kind === "events"); afters.push(request.after);
      return afters.length === 1 ? empty.promise : { kind: "events", page: { schemaVersion: 1, after: request.after, nextCursor: 11, events: [event] } };
    },
    async watch(request) { watchId = request.watchId; return { watchId, cursor: 10 }; },
    async unwatch() {}, onCursor(listener) { notify = listener; return () => {}; }
  };
  const close = createConversationClient(bridge, "local").subscribe({ after: 9, conversationId: "conversation", onEvent: (value) => seen.push(value.cursor), onError: (error) => errors.push(error) });
  try {
    await until(() => afters.length === 1);
    notify({ schemaVersion: 1, environmentId: "local", watchId, cursor: 11 });
    empty.resolve({ kind: "events", page: { schemaVersion: 1, after: 9, nextCursor: 9, events: [] } });
    await until(() => seen.length === 1 || errors.length > 0);
    assert.deepEqual(afters, [9, 10]); assert.deepEqual(seen, [11]); assert.deepEqual(errors, []);
  } finally { close(); }
});

test("turn review patches cross the typed IPC/client boundary without exposing unchanged checkpoint contents", async (t) => {
  const f = fixture(t); f.create();
  const providers = new ProviderRegistry(); const provider = new ProviderDouble(); providers.register(provider);
  let current = snapshot({ "document.md": "Before\n", "private.md": "Private unchanged bytes\n" });
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority,
    owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => true,
    now: () => "2026-11-09T10:00:00.000Z", nextId: randomUUID, onFailure(failure) { assert.fail(failure.message); },
    checkpoints: { async capture() { return { status: "ready", snapshot: current }; }, compare: (before, after) => compareSnapshots("git", before, after) } });
  host.start(); const ipc = new GatewayFixture({ resolveHost: () => host });
  const client = createConversationClient(ipc.bridge(new FixtureSubscriber(1)), "local");
  const seen: ConversationEvent[] = []; const errors: Error[] = [];
  const close = client.subscribe({ after: host.eventCursor(), conversationId: "conversation",
    onEvent: (event) => seen.push(event), onError: (error) => errors.push(error) });
  try {
    await client.execute({ kind: "submit", commandId: "send", conversationId: "conversation", runId: "run", instruction: "Fixture" });
    await until(() => provider.active.size === 1);
    current = snapshot({ "document.md": "After\n", "private.md": "Private unchanged bytes\n" }, "2026-11-09T10:01:00.000Z");
    const run = host.header("conversation")?.activeRuns[0]; assert.ok(run);
    provider.finish(run.attemptId, "completed");
    await until(() => seen.some((event) => event.payload.kind === "item" && event.payload.item.kind === "review") || errors.length > 0);
    assert.deepEqual(errors, []);
    const history = await client.history({ conversationId: "conversation", scope: "timeline", limit: 100 });
    assert.ok(history.scope === "timeline");
    const item = history.items.find((entry) => entry.kind === "review");
    assert.ok(item?.kind === "review" && item.result.status === "ready" && item.result.scope === "turn");
    assert.ok(item.result.changes[0].patch?.includes("-Before\n+After"));
    assert.equal(JSON.stringify(seen).includes("Private unchanged bytes"), false);
    assert.equal(JSON.stringify(history).includes(Buffer.from("Private unchanged bytes\n").toString("base64")), false);
  } finally { close(); ipc.dispose(); await host.shutdown(); }
});

test("closing before the watch handshake returns cleans up its eventual remote registration", async () => {
  const gate = deferred<void>(); const cleanups: string[] = []; let listening = false;
  const bridge: ConversationBridge = { async mcp() { throw new Error("Unused"); }, async account() { throw new Error("Unused"); }, async skills() { throw new Error("Unused"); }, async execute() { throw new Error("Unused"); }, async read() { throw new Error("View already closed"); },
    async watch(request) { await gate.promise; return { watchId: request.watchId, cursor: 5 }; },
    async unwatch(request) { cleanups.push(request.watchId); }, onCursor() { listening = true; return () => { listening = false; }; } };
  const close = createConversationClient(bridge, "local").subscribe({ after: 0, onEvent() { assert.fail("Closed view received an event"); }, onError() { assert.fail("Closed view received an error"); } });
  close(); assert.equal(listening, false); assert.equal(cleanups.length, 1);
  gate.resolve(); await until(() => cleanups.length === 2);
  assert.equal(cleanups[0], cleanups[1]);
});

test("preload rejects incompatible or credential-bearing responses with a sanitized error", async () => {
  const bridge = createConversationBridge({ async invoke() { return { ok: true, value: { kind: "header", header: null, credential: "private" } }; },
    onCursor() { return () => {}; } });
  await assert.rejects(bridge.read({ schemaVersion: 1, environmentId: "local", kind: "header", conversationId: "conversation" }),
    (error: Error) => error.message.includes("incompatible") && !error.message.includes("private"));
});

test("a cursor from a newer or different store fails hydration instead of silently waiting forever", async () => {
  const errors: Error[] = [];
  const bridge: ConversationBridge = { async mcp() { throw new Error("Unused"); }, async account() { throw new Error("Unused"); }, async skills() { throw new Error("Unused"); }, async execute() { throw new Error("Unused"); }, async read() { throw new Error("Invalid cursor should not replay"); },
    async watch(request) { return { watchId: request.watchId, cursor: 1 }; }, async unwatch() {}, onCursor() { return () => {}; } };
  const close = createConversationClient(bridge, "local").subscribe({ after: 99, onEvent() { assert.fail("Unexpected event"); }, onError: (error) => errors.push(error) });
  try { await until(() => errors.length === 1); assert.match(errors[0].message, /cursor is unavailable/); }
  finally { close(); }
});

test("ordinary conversation commands still reject a receipt for a different thread", async () => {
  const bridge = createConversationBridge({ async invoke() { return { ok: true, value: { kind: "receipt", receipt: {
    commandId: "send", conversationId: "another-thread", cursor: 1, acceptedAt: "2026-11-10T10:00:00.000Z"
  } } }; }, onCursor() { return () => {}; } });
  await assert.rejects(bridge.execute({ schemaVersion: 1, environmentId: "local", command: {
    kind: "submit", commandId: "send", conversationId: "expected-thread", runId: "run", instruction: "Continue"
  } }), /incompatible response/);
});
