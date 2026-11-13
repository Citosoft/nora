import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { join, dirname } from "node:path";
import { readFile } from "node:fs/promises";
import { createThreadReferenceWriter } from "@main/execution/thread-references/writeSnapshot";
import { ExecutionHost } from "@main/execution/host";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { conversationChannels } from "@shared/conversations/gateway";
import { ConversationAccessError } from "@shared/conversations/errors";
import { fixture, workspaceAuthority } from "./fixture";
import { FixtureSubscriber, GatewayFixture } from "./gatewayFixture";
import { ProviderDouble } from "./providerDouble";

test("native chat references route through the owning host without starting the provider or trusting caller paths", async (t) => {
  const f = fixture(t); f.create();
  const providers = new ProviderRegistry(); const provider = new ProviderDouble(); providers.register(provider);
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority,
    owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => true, now: () => "2026-11-12T10:00:00.000Z", nextId: randomUUID,
    writeThreadReference: createThreadReferenceWriter(join(dirname(f.path), "references")), onFailure: () => assert.fail("host failed") });
  host.start(); const ipc = new GatewayFixture({ resolveHost: (id) => id === "local" ? host : null });
  const sender = new FixtureSubscriber(1); const bridge = ipc.bridge(sender);
  const request = { schemaVersion: 1 as const, environmentId: "local", kind: "thread-reference" as const, conversationId: "conversation" };
  try {
    const value = await bridge.read(request);
    assert.ok(value.kind === "thread-reference");
    assert.equal(value.reference.environmentId, "local"); assert.equal(value.reference.conversationId, "conversation");
    assert.ok((await readFile(value.reference.indexPath, "utf8")).includes("no shareable messages"));
    assert.equal(provider.starts, 0);
    await assert.rejects(bridge.read({ ...request, environmentId: "other" }), /owning execution host/);
    await assert.rejects(bridge.read({ ...request, conversationId: "missing" }), /unavailable/);
    const injected = await ipc.invoke(sender, conversationChannels.read, { ...request, indexPath: "/untrusted" });
    assert.ok(!injected.ok && injected.error.code === "invalid");
    sender.allowed = false;
    await assert.rejects(bridge.read(request), /unavailable for this window/);
  } finally { ipc.dispose(); await host.shutdown(); }
});

test("IPC validates schema and sender, isolates environments and sanitizes unexpected host failures", async (t) => {
  const f = fixture(t); f.create();
  const providers = new ProviderRegistry(); providers.register(new ProviderDouble());
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority,
    owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => true, now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID, onFailure() {} });
  host.start();
  const ipc = new GatewayFixture({ resolveHost(environmentId) {
    if (environmentId === "broken") throw new Error("secret provider detail");
    return environmentId === "local" || environmentId === "wrong-route" ? host : null;
  } });
  const sender = new FixtureSubscriber(1); const bridge = ipc.bridge(sender);
  try {
    const header = await bridge.read({ schemaVersion: 1, environmentId: "local", kind: "header", conversationId: "conversation" });
    assert.ok(header.kind === "header" && header.header);
    await assert.rejects(bridge.read({ schemaVersion: 1, environmentId: "ssh", kind: "header", conversationId: "conversation" }),
      (error: Error) => error instanceof ConversationAccessError && error.code === "environment");
    await assert.rejects(bridge.read({ schemaVersion: 1, environmentId: "wrong-route", kind: "summaries" }),
      (error: Error) => error instanceof ConversationAccessError && error.code === "environment");
    const invalid = await ipc.invoke(sender, conversationChannels.read, { schemaVersion: 1, environmentId: "local", kind: "events", after: 0, limit: 201, credential: "secret" });
    assert.ok(!invalid.ok && invalid.error.code === "invalid"); assert.equal(JSON.stringify(invalid).includes("secret"), false);
    const incompatible = await ipc.invoke(sender, conversationChannels.read, { schemaVersion: 99, environmentId: "local", kind: "summaries" });
    assert.ok(!incompatible.ok && incompatible.error.code === "invalid");
    await assert.rejects(bridge.read({ schemaVersion: 1, environmentId: "broken", kind: "summaries" }), (error: Error) => !error.message.includes("secret"));
    sender.allowed = false;
    await assert.rejects(bridge.read({ schemaVersion: 1, environmentId: "local", kind: "summaries" }), /unavailable for this window/);
  } finally { ipc.dispose(); await host.shutdown(); }
});

test("window-scoped watches coalesce hints, retry idempotently and detach on navigation without stopping work", async (t) => {
  const f = fixture(t); f.create();
  const providers = new ProviderRegistry(); const provider = new ProviderDouble(); providers.register(provider);
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority,
    owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => true, now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID, onFailure() {} });
  host.start(); const ipc = new GatewayFixture({ resolveHost: () => host });
  const first = new FixtureSubscriber(1); const second = new FixtureSubscriber(2);
  const bridge = ipc.bridge(first); const other = ipc.bridge(second);
  const watch = { schemaVersion: 1 as const, environmentId: "local", watchId: "view", conversationId: "conversation" };
  let hints = 0; const detach = bridge.onCursor(() => { hints++; });
  try {
    const receipt = await bridge.watch(watch); assert.deepEqual(await bridge.watch(watch), receipt);
    await bridge.watch({ ...watch, watchId: "second-pane" });
    assert.equal(first.listenerCount("destroyed"), 1);
    await assert.rejects(bridge.watch({ ...watch, conversationId: "different" }), /already belongs/);
    await other.unwatch({ schemaVersion: 1, environmentId: "local", watchId: watch.watchId }); // Another window cannot cancel this subscription.
    await bridge.unwatch({ schemaVersion: 1, environmentId: "local", watchId: "second-pane" });
    await host.execute({ kind: "submit", commandId: "send", conversationId: "conversation", runId: "run", instruction: "Run" });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.ok(hints); assert.equal(provider.starts, 1);
    const before = hints; const run = f.snapshot().runs[0];
    const active = provider.active.get(run.attemptId); assert.ok(active);
    for (let index = 0; index < 20; index++) active.emit({ kind: "item", eventId: `delta-${index}`, conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
      item: { kind: "message", role: "assistant", id: "assistant", runId: run.id, text: `${index}`, complete: false, createdAt: run.createdAt } });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    assert.equal(hints, before + 1);
    first.emit("did-start-navigation");
    const detached = hints;
    await host.execute({ kind: "submit", commandId: "queue", conversationId: "conversation", runId: "queued", instruction: "Next" });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(hints, detached); assert.equal(provider.active.size, 1);
    assert.equal(first.listenerCount("destroyed"), 0);
    assert.equal(first.listenerCount("render-process-gone"), 0);
  } finally { detach(); ipc.dispose(); await host.shutdown(); }
  assert.equal(ipc.handlers.size, 0);
});
