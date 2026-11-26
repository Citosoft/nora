import type { ConnectorServiceOptions } from "@main/types/connectors/connectors.types";
import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createConnectorService } from "@main/connectors/service";
import type { Connector, ConnectorSubject } from "@shared/types/connectors/connectors.types";
import { CONNECTOR_ACCESS_ALL } from "@shared/connectors/access";
import type { RunMcpServer } from "@main/types/nora-tools/noraTools.types";
import { startFakeMcpServer } from "./fakeMcpServer";
import { storeFixture, until } from "./fixture";

/** A plain thread in workspace "w": what every connector reached before access could be limited. */
const ANY_THREAD: ConnectorSubject = { workspaceId: "w", botId: null };
let ids = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++ids).padStart(12, "0")}`;

test("DNS failures reach both the connection status and sign-in reply without opening the browser", async (t) => {
  const { store } = storeFixture(t);
  let opened = false;
  const service = createConnectorService({ store, nextId, callbackPort: 0, onChanged: () => {},
    openExternal: async () => { opened = true; },
    fetch: async () => { throw new TypeError("fetch failed", { cause: Object.assign(new Error("getaddrinfo"), { code: "ENOTFOUND" }) }); } });
  t.after(() => service.close());
  const [connector] = await service.create({ name: "Staging", url: "https://mcp.example.com/mcp", auth: { kind: "oauth" } });
  assert.ok(connector);
  await until(() => service.list()[0]?.status !== "checking", "DNS check");
  assert.match(service.list()[0]?.message ?? "", /could not resolve mcp\.example\.com/);
  await assert.rejects(service.signIn(connector.id), /Sign-in to Staging did not complete: Nora could not resolve mcp\.example\.com/);
  assert.match(service.list()[0]?.message ?? "", /could not resolve mcp\.example\.com/);
  assert.equal(opened, false);
});

function serviceFixture(t: test.TestContext, connectorIdsForBot?: ConnectorServiceOptions["connectorIdsForBot"]) {
  const { store } = storeFixture(t);
  const changes: Connector[][] = [];
  const opened: string[] = [];
  // Stands in for the user's browser: following the authorization URL lands on Nora's callback with the code.
  const openExternal = async (url: string) => { opened.push(url); await fetch(url); };
  const service = createConnectorService({ store, openExternal, onChanged: (list) => changes.push(list), nextId, callbackPort: 0, connectorIdsForBot });
  t.after(() => service.close());
  const status = (id: string) => service.list().find((connector) => connector.id === id)?.status;
  const settled = (id: string) => until(() => status(id) !== "checking", "the connector check");
  return { service, store, changes, opened, status, settled };
}

/** Uses a connector the way a thread's runtime does: through the gateway, with only the gateway token. */
async function callEcho(endpoint: RunMcpServer, text: string): Promise<string> {
  const client = new Client({ name: "runtime", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint.url), { requestInit: { headers: { Authorization: `Bearer ${endpoint.token}` } } }));
  try {
    const result = await client.callTool({ name: "echo", arguments: { text } });
    const [content] = result.content as { type: string; text: string }[];
    return content?.text ?? "";
  } finally { await client.close(); }
}

test("an OAuth connector follows its authentication challenge to sign in through the browser, then refreshes through the gateway", async (t) => {
  const upstream = await startFakeMcpServer({ auth: "oauth", resourceMetadataPath: "/auth/resource" });
  t.after(() => upstream.close());
  const { service, store, opened, status, settled } = serviceFixture(t);
  const [created] = await service.create({ name: "Fake", url: upstream.url, auth: { kind: "oauth" } });
  assert.ok(created);
  await settled(created.id);
  assert.equal(status(created.id), "needs-auth");
  assert.equal((await service.endpoints(ANY_THREAD)).length, 1, "OAuth connectors waiting on sign-in stay attachable so a tool call can open the authorize card");

  const [signedIn] = await service.signIn(created.id);
  assert.equal(opened.length, 1);
  assert.match(opened[0] ?? "", /code_challenge_method=S256/);
  assert.equal(signedIn?.status, "connected");
  assert.deepEqual(signedIn?.tools.map((tool) => tool.name), ["echo"]);
  assert.deepEqual(signedIn?.auth, { kind: "oauth", customClient: false, signedIn: true });
  assert.deepEqual(signedIn?.logo, { kind: "domain", domain: "example.com" });
  assert.equal(upstream.registrations, 1, "the client registered itself dynamically");

  const [endpoint] = await service.endpoints(ANY_THREAD);
  assert.ok(endpoint);
  assert.equal(endpoint.name, "fake");
  assert.doesNotMatch(endpoint.token, /access-/);
  assert.equal(await callEcho(endpoint, "hello"), "hello");
  assert.equal(upstream.lastHeaders?.authorization, "Bearer access-1");

  // The server stops accepting the token: the gateway refreshes once and retries, and the new refresh token is kept.
  upstream.validTokens.clear();
  assert.equal(await callEcho(endpoint, "again"), "again");
  assert.equal(upstream.refreshes, 1);
  assert.equal(store.secrets(created.id).tokens?.tokens.refresh_token, "refresh-2");

  await service.signIn(created.id);
  assert.equal(opened.length, 2, "an explicit retry opens the browser even when tokens are saved");
  assert.equal(status(created.id), "connected");

  await service.signOut(created.id);
  assert.equal(status(created.id), "needs-auth");
  assert.equal((await service.endpoints(ANY_THREAD)).length, 1, "signed-out OAuth connectors stay attachable for re-authorize");
});

test("a rejected refresh marks the connector as needing sign-in instead of failing silently", async (t) => {
  const upstream = await startFakeMcpServer({ auth: "oauth" });
  t.after(() => upstream.close());
  const { service, store, status, settled } = serviceFixture(t);
  const [created] = await service.create({ name: "Fake", url: upstream.url, auth: { kind: "oauth" } });
  assert.ok(created);
  await settled(created.id);
  await service.signIn(created.id);
  const [endpoint] = await service.endpoints(ANY_THREAD);
  assert.ok(endpoint);
  upstream.validTokens.clear();
  store.updateSecrets(created.id, { tokens: { tokens: { access_token: "stale", token_type: "Bearer", refresh_token: "revoked" }, savedAt: Date.now() } });
  const response = await fetch(endpoint.url, { method: "POST", headers: { Authorization: `Bearer ${endpoint.token}`, "content-type": "application/json",
    accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "echo", arguments: { text: "x" } } }) });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("www-authenticate"), null, "runtimes never get a reason to start their own sign-in");
  assert.equal(status(created.id), "needs-auth");
  assert.equal(store.secrets(created.id).requiresSignIn, true);
  const attempts = upstream.tokenRequests;
  await service.refresh(created.id);
  await service.refresh(created.id);
  assert.equal(upstream.tokenRequests, attempts, "connection checks do not retry permanently rejected credentials");
  await service.signIn(created.id);
  assert.equal(status(created.id), "connected");
  assert.equal(store.secrets(created.id).requiresSignIn, undefined);
});

test("header connectors send their header upstream; the gateway refuses callers without its token", async (t) => {
  const upstream = await startFakeMcpServer({ auth: "header", headerValue: "key-123" });
  t.after(() => upstream.close());
  const { service, status, settled } = serviceFixture(t);
  const [created] = await service.create({ name: "Keyed", url: upstream.url, auth: { kind: "header", name: "X-Api-Key", value: "key-123" } });
  assert.ok(created);
  await settled(created.id);
  assert.equal(status(created.id), "connected");
  const [endpoint] = await service.endpoints(ANY_THREAD);
  assert.ok(endpoint);
  assert.equal(await callEcho(endpoint, "keyed"), "keyed");
  assert.equal((await fetch(endpoint.url, { method: "POST", headers: { Authorization: "Bearer wrong" } })).status, 401);

  await service.setEnabled(created.id, false);
  assert.equal(status(created.id), "disabled");
  assert.deepEqual(await service.endpoints(ANY_THREAD), []);
  assert.equal((await fetch(endpoint.url, { method: "POST", headers: { Authorization: `Bearer ${endpoint.token}` } })).status, 404);
});

test("a wrong header or an unreachable server is reported with a reason", async (t) => {
  const upstream = await startFakeMcpServer({ auth: "header", headerValue: "right" });
  t.after(() => upstream.close());
  const { service, settled } = serviceFixture(t);
  const [wrong] = await service.create({ name: "Wrong", url: upstream.url, auth: { kind: "header", name: "X-Api-Key", value: "wrong" } });
  assert.ok(wrong);
  await settled(wrong.id);
  const rejected = service.list().find((connector) => connector.id === wrong.id);
  assert.equal(rejected?.status, "failed");
  assert.match(rejected?.message ?? "", /rejected the X-Api-Key header/);
  const missing = (await service.create({ name: "Missing", url: upstream.url.replace("/mcp", "/nothing"), auth: { kind: "oauth" } })).at(-1);
  assert.ok(missing);
  await settled(missing.id);
  assert.match(service.list().find((connector) => connector.id === missing.id)?.message ?? "", /did not answer at this URL/);
});

test("servers without sign-in connect directly and connector names stay unique", async (t) => {
  const upstream = await startFakeMcpServer({ auth: "none" });
  t.after(() => upstream.close());
  const { service, settled, opened } = serviceFixture(t);
  await service.create({ name: "Open", url: upstream.url, auth: { kind: "oauth" } });
  const list = await service.create({ name: "Open", url: upstream.url, auth: { kind: "oauth" } });
  await Promise.all(list.map((connector) => settled(connector.id)));
  assert.deepEqual(service.list().map((connector) => [connector.serverName, connector.status]), [["open", "connected"], ["open_2", "connected"]]);
  assert.equal(service.activeCount(ANY_THREAD), 2);
  await service.signIn(list[0]!.id);
  assert.deepEqual(opened, [], "a public MCP server does not need OAuth discovery or a browser");
  await service.signOut(list[0]!.id);
  await service.signIn(list[0]!.id);
  assert.equal(service.list()[0]?.status, "connected");
  await service.remove(list[0]?.id ?? "");
  assert.deepEqual(service.list().map((connector) => connector.serverName), ["open_2"]);
});

test("access limits which threads get a connector, persists, and is published to the window", async (t) => {
  const upstream = await startFakeMcpServer({ auth: "none" });
  t.after(() => upstream.close());
  const { service, store, changes, settled } = serviceFixture(t);
  const [created] = await service.create({ name: "Open", url: upstream.url, auth: { kind: "oauth" },
    access: { workspaces: { kind: "only", ids: ["w"] }, bots: { kind: "all" } } });
  assert.ok(created);
  await settled(created.id);
  assert.equal((await service.endpoints(ANY_THREAD)).length, 1);
  assert.deepEqual(await service.endpoints({ workspaceId: "other", botId: null }), [], "other workspaces don't get it");

  const published = changes.length;
  const access = { workspaces: { kind: "all" as const }, bots: { kind: "only" as const, ids: ["ada"] } };
  const [updated] = await service.setAccess(created.id, access);
  assert.deepEqual(updated?.access, access);
  assert.ok(changes.length > published, "the change is pushed to the window");
  assert.deepEqual(store.get(created.id)?.access, access, "the rule is stored");
  assert.deepEqual(await service.endpoints(ANY_THREAD), [], "plain threads are left out once bots are limited");
  assert.equal(service.activeCount({ workspaceId: "other", botId: "ada" }), 1);
  assert.equal(service.activeCount({ workspaceId: "w", botId: "grace" }), 0);

  const [plain] = await service.create({ name: "Plain", url: upstream.url, auth: { kind: "oauth" } });
  assert.deepEqual(service.list().find((connector) => connector.id !== created.id)?.access, CONNECTOR_ACCESS_ALL, "new connectors default to everywhere");
  assert.ok(plain);
  await assert.rejects(service.setAccess("00000000-0000-4000-8000-999999999999", access), /no longer exists/);
});

test("live bot selections filter endpoints, counts and tools without changing other threads", async (t) => {
  const upstream = await startFakeMcpServer({ auth: "none" });
  t.after(() => upstream.close());
  let selection: readonly string[] | undefined;
  const { service, settled } = serviceFixture(t, () => selection);
  const [created] = await service.create({ name: "Selected", url: upstream.url, auth: { kind: "oauth" } });
  assert.ok(created);
  await settled(created.id);
  const subject: ConnectorSubject = { workspaceId: "w", botId: "ada" };
  assert.equal(service.activeCount(subject), 1, "existing bots without a selection retain access");
  selection = [];
  assert.deepEqual(await service.endpoints(subject), []);
  assert.equal(service.activeCount(subject), 0);
  assert.deepEqual(service.tools.available(subject), []);
  await assert.rejects(service.tools.call(created.id, "echo", { text: "blocked" }, subject), /not available/);
  assert.equal(service.activeCount(ANY_THREAD), 1, "plain threads ignore bot selections");
  selection = [created.id];
  assert.equal((await service.endpoints(subject)).length, 1);
  assert.equal(service.activeCount(subject), 1);
  assert.deepEqual(service.tools.available(subject).map((connector) => connector.id), [created.id]);
  assert.equal((await service.tools.call(created.id, "echo", { text: "allowed" }, subject)).isError, undefined);
  assert.equal(service.activeCount({ ...subject, workspaceId: "other" }), 1);
  await service.setAccess(created.id, { workspaces: { kind: "only", ids: ["w"] }, bots: { kind: "all" } });
  assert.equal(service.activeCount({ ...subject, workspaceId: "other" }), 0, "a selection cannot widen workspace restrictions");
  await service.setEnabled(created.id, false);
  assert.deepEqual(service.tools.available(subject), []);
  await assert.rejects(service.tools.call(created.id, "echo", {}, subject), /not available/);
});
