import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { captureProviderConnection } from "@main/execution/providerConnection";
import { ExecutionHost } from "@main/execution/host";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { ProviderDouble } from "./providerDouble";
import { fixture, provider, workspaceAuthority } from "./fixture";
import { pickerCatalog } from "../../renderer/modelPickerFixtures";
import type { ProviderConnectionKind } from "@shared/types/provider/account.types";
import type { ConversationCommand } from "@shared/types/conversation/contracts.types";

const workspace = { environmentId: "local", projectId: "project", checkoutId: "checkout", path: "/test/checkout", branch: "main", access: "write" as const };
const create = (id: string): Extract<ConversationCommand, { kind: "create" }> => ({
  kind: "create", commandId: `create-${id}`, conversationId: id, title: id, parentId: null, workspace, provider
});

test("the host captures connection identity once, rejects client guesses, and preserves receipts across account switches", async (t) => {
  const f = fixture(t);
  let connection: ProviderConnectionKind = "subscription";
  let lookups = 0;
  const runtime = new ProviderDouble();
  runtime.catalog = async () => {
    lookups++;
    const result = pickerCatalog({ kind: provider.kind, instanceId: provider.instanceId });
    return { ...result, catalog: { ...result.catalog, connection } };
  };
  const providers = new ProviderRegistry(); providers.register(runtime);
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority,
    owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => true,
    now: () => "2026-11-20T10:00:00.000Z", nextId: randomUUID, onFailure: (failure) => assert.fail(failure.message) });
  host.start();
  try {
    const command = { ...create("before"), provider: { ...provider, connection: "api" as const } };
    const receipt = await host.execute(command);
    assert.equal(host.header("before")?.conversation.provider.connection, "subscription");
    connection = "api";
    await host.execute(create("after"));
    assert.equal(host.header("before")?.conversation.provider.connection, "subscription");
    assert.equal(host.header("after")?.conversation.provider.connection, "api");
    assert.deepEqual(await host.execute(command), receipt);
    assert.equal(lookups, 2, "a retry must not recapture today's connection");
    await host.execute({ kind: "rename", commandId: "rename", conversationId: "before", title: "Renamed" });
    assert.equal(host.header("before")?.conversation.provider.connection, "subscription");
  } finally { await host.shutdown(); }
  f.restart();
  assert.equal(f.snapshot("before").conversation.provider.connection, "subscription");
  assert.equal(f.snapshot("after").conversation.provider.connection, "api");
});

test("imported, unavailable and legacy identities stay unknown rather than inheriting the current account", async () => {
  const runtime = new ProviderDouble();
  runtime.catalog = async () => {
    const result = pickerCatalog({ kind: provider.kind, instanceId: provider.instanceId });
    return { ...result, catalog: { ...result.catalog, connection: "api" } };
  };
  const providers = new ProviderRegistry(); providers.register(runtime);
  assert.equal(await captureProviderConnection(providers, provider, workspace, true), "unknown");
  runtime.catalog = async () => { throw new Error("Offline"); };
  assert.equal(await captureProviderConnection(providers, provider, workspace, false), "unknown");
  await providers.close();
});

test("each run keeps the connection saved on its thread across subsequent commands and storage restart", (t) => {
  const f = fixture(t);
  f.engine.execute(create("before"), { providerConnection: "subscription" });
  f.submit("first", "before");
  assert.equal(f.snapshot("before").runs[0].provider?.connection, "subscription");
  f.restart();
  f.engine.execute({ ...create("after"), workspace: { ...workspace, checkoutId: "other", path: "/test/other" } }, { providerConnection: "api" });
  f.submit("next", "before");
  f.submit("first", "after");
  assert.deepEqual(f.snapshot("before").runs.map((run) => run.provider?.connection), ["subscription", "subscription"]);
  assert.equal(f.snapshot("after").runs[0].provider?.connection, "api");
});
