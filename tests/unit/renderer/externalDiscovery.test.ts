import assert from "node:assert/strict";
import test from "node:test";
import { createExternalDiscoveryStore } from "@/components/app/logic/thread-workspace/externalDiscovery";
import type { ExternalDiscoveryTarget } from "@/components/app/types/externalSessions.types";
import type { ExternalSession, ExternalSessionsResult } from "@shared/types/conversation/externalSessions.types";

const session = (id: string): ExternalSession => ({ origin: "cli", id, providerKind: "claude", instanceId: "account", cwd: "/project", title: id,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
const target = (id: string): ExternalDiscoveryTarget => ({ workspace: { id, name: id, workspace: { environmentId: "local", projectId: id, checkoutId: id, path: `/${id}`, branch: "main", access: "write" } },
  provider: { kind: "claude", instanceId: "account" } });
const settle = () => new Promise((resolve) => setImmediate(resolve));

function harness() {
  const calls: string[] = [];
  const pending: { projectId: string; resolve(result: ExternalSessionsResult): void }[] = [];
  const store = createExternalDiscoveryStore({ client: { externalSessions: (_kind, _instance, workspace) => {
    calls.push(workspace.projectId);
    return new Promise((resolve) => { pending.push({ projectId: workspace.projectId, resolve }); });
  } } });
  const answer = (sessions: ExternalSession[]) => { for (const entry of pending.splice(0)) entry.resolve({ status: "available", sessions }); };
  return { store, calls, answer };
}

test("each workspace is scanned once, however often discovery is requested", async () => {
  const { store, calls, answer } = harness();
  store.ensure([target("a")]); store.ensure([target("a")]);
  answer([session("one")]); await settle();
  store.ensure([target("a")]);
  assert.deepEqual(calls, ["a"]);
  assert.deepEqual(store.snapshot().entries.map((entry) => entry.session.id), ["one"]);
  store.ensure([target("a"), target("b")]);
  assert.deepEqual(calls, ["a", "b"]);
});

test("refresh rescans while keeping the current results visible until new ones arrive", async () => {
  const { store, calls, answer } = harness();
  store.ensure([target("a")]); answer([session("one")]); await settle();
  store.refresh([target("a")]);
  assert.deepEqual(calls, ["a", "a"]);
  assert.equal(store.snapshot().loading, true);
  assert.deepEqual(store.snapshot().entries.map((entry) => entry.session.id), ["one"]);
  answer([session("one"), session("two")]); await settle();
  assert.equal(store.snapshot().loading, false);
  assert.deepEqual(store.snapshot().entries.map((entry) => entry.session.id), ["one", "two"]);
});
