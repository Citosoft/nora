import assert from "node:assert/strict";
import test from "node:test";
import { createConnectorCredentials } from "@main/connectors/credentials";
import { createConnectorToolClient } from "@main/connectors/toolClient";
import { ConnectorToolError } from "@main/connectors/toolError";
import type { StoredConnector } from "@main/types/connectors/connectors.types";
import { startFakeMcpServer } from "./fakeMcpServer";
import { storeFixture } from "./fixture";

test("Nora calls connector tools itself with the stored header, lists their input schemas, and reports a bad key as a sign-in problem", async (t) => {
  const upstream = await startFakeMcpServer({ auth: "header", headerValue: "secret" });
  t.after(() => upstream.close());
  const { store } = storeFixture(t);
  const connector: StoredConnector = { id: "c1", name: "Fake", serverName: "fake", url: upstream.url, enabled: true, auth: { kind: "header", name: "x-api-key" },
    access: { workspaces: { kind: "all" }, bots: { kind: "all" } } };
  store.add(connector, { headerValue: "secret" });
  const needsAuth: string[] = [];
  const client = createConnectorToolClient({ store, credentials: createConnectorCredentials({ store }), onNeedsAuth: (id) => needsAuth.push(id) });
  t.after(() => client.close());
  const result = await client.callTool("c1", "echo", { text: "hi" });
  assert.deepEqual(result.content, [{ type: "text", text: "hi" }]);
  assert.equal(upstream.lastHeaders?.["x-api-key"], "secret");
  const tools = await client.listTools("c1");
  assert.equal(tools[0]?.name, "echo");
  assert.equal(tools[0]?.inputSchema?.type, "object");

  store.update("c1", { enabled: false });
  await assert.rejects(client.callTool("c1", "echo", { text: "x" }), (error: unknown) => error instanceof ConnectorToolError && error.kind === "unavailable");
  store.update("c1", { enabled: true });
  store.updateSecrets("c1", { headerValue: "wrong" });
  await client.forget("c1");
  await assert.rejects(client.callTool("c1", "echo", { text: "x" }), (error: unknown) => error instanceof ConnectorToolError && error.kind === "needs-auth");
  assert.deepEqual(needsAuth, ["c1"]);
});
