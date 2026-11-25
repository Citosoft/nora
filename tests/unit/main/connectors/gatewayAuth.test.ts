import assert from "node:assert/strict";
import test from "node:test";
import { createConnectorAuthPrompts } from "@main/connectors/authPrompts";
import { createConnectorService } from "@main/connectors/service";
import type { Connector } from "@shared/types/connectors/connectors.types";
import { startFakeMcpServer } from "./fakeMcpServer";
import { storeFixture, until } from "./fixture";

const ANY_THREAD = { workspaceId: "w", botId: null as string | null };
let ids = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++ids).padStart(12, "0")}`;

test("a gateway call against a needs-auth OAuth connector holds until the authorize prompt is signed in, then retries", async (t) => {
  const upstream = await startFakeMcpServer({ auth: "oauth" });
  t.after(() => upstream.close());
  const { store } = storeFixture(t);
  const opened: string[] = [];
  let sequence = 0;
  const authPrompts = createConnectorAuthPrompts({
    nextId: () => `auth${++sequence}`,
    now: () => new Date().toISOString(),
    timeoutMs: 30_000,
    onChanged: () => {}
  });
  const openExternal = async (url: string) => { opened.push(url); await fetch(url); };
  const service = createConnectorService({ store, openExternal, onChanged: () => {}, nextId, callbackPort: 0, authPrompts });
  t.after(() => service.close());

  const [created] = await service.create({ name: "Fake", url: upstream.url, auth: { kind: "oauth" } });
  assert.ok(created);
  await until(() => service.list().find((connector) => connector.id === created.id)?.status === "needs-auth", "needs-auth");

  const [endpoint] = await service.endpoints(ANY_THREAD, undefined, ["thread-1", "chat-1"]);
  assert.ok(endpoint);
  assert.match(endpoint.url, /\/connectors\/thread-1\//);

  const call = fetch(endpoint.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${endpoint.token}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
  });

  await until(() => authPrompts.pending().length === 1, "authorize prompt");
  const prompt = authPrompts.pending()[0];
  assert.ok(prompt);
  assert.deepEqual(prompt.conversationIds, ["thread-1", "chat-1"]);
  assert.equal(prompt.connectorId, created.id);

  const [signedIn] = await service.signIn(created.id);
  assert.equal(signedIn?.status, "connected");
  assert.equal(opened.length, 1);
  assert.deepEqual(authPrompts.pending(), []);

  const response = await call;
  assert.equal(response.status, 200);
});

test("declining the authorize prompt releases the gateway call with 401", async (t) => {
  const upstream = await startFakeMcpServer({ auth: "oauth" });
  t.after(() => upstream.close());
  const { store } = storeFixture(t);
  let sequence = 0;
  const authPrompts = createConnectorAuthPrompts({
    nextId: () => `auth${++sequence}`,
    now: () => new Date().toISOString(),
    timeoutMs: 30_000,
    onChanged: () => {}
  });
  const service = createConnectorService({
    store, openExternal: async () => {}, onChanged: () => {}, nextId, callbackPort: 0, authPrompts
  });
  t.after(() => service.close());

  const [created] = await service.create({ name: "Fake", url: upstream.url, auth: { kind: "oauth" } });
  assert.ok(created);
  await until(() => service.list().find((c: Connector) => c.id === created.id)?.status === "needs-auth", "needs-auth");

  const [endpoint] = await service.endpoints(ANY_THREAD, undefined, ["thread-2"]);
  assert.ok(endpoint);
  const call = fetch(endpoint.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${endpoint.token}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
  });
  await until(() => authPrompts.pending().length === 1, "authorize prompt");
  const prompt = authPrompts.pending()[0];
  assert.ok(prompt);
  authPrompts.settle(prompt.id, { kind: "declined" });
  assert.equal((await call).status, 401);
});
