import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { storeFixture } from "./fixture";
import type { StoredConnector } from "@main/types/connectors/connectors.types";
import { CONNECTOR_ACCESS_ALL } from "@shared/connectors/access";

const linear: StoredConnector = { id: "7f0c1e1a-3c1b-4c55-9a59-6f1f6e1f2a01", name: "Linear", serverName: "linear",
  url: "https://mcp.linear.app/mcp", enabled: true, auth: { kind: "oauth" }, access: CONNECTOR_ACCESS_ALL };

test("connectors persist with their secrets encrypted, never in the clear", (t) => {
  const { store, path, reopen } = storeFixture(t);
  store.add(linear, {});
  store.updateSecrets(linear.id, { tokens: { tokens: { access_token: "secret-access", token_type: "Bearer", refresh_token: "secret-refresh" }, savedAt: 1 } });
  const discovery = { authorizationServerUrl: "https://auth.example.com", resourceMetadataUrl: "https://mcp.example.com/auth/resource",
    resourceMetadata: { resource: linear.url, authorization_servers: ["https://auth.example.com"] } };
  store.updateSecrets(linear.id, { discovery });
  const file = readFileSync(path, "utf8");
  assert.doesNotMatch(file, /secret-access|secret-refresh/);
  const reopened = reopen();
  assert.deepEqual(reopened.list(), [linear]);
  assert.equal(reopened.secrets(linear.id).tokens?.tokens.access_token, "secret-access");
  assert.deepEqual(reopened.secrets(linear.id).discovery, discovery, "refresh can find the same authorization server after restarting");
});

test("a patch merges secrets and removes the ones set to undefined", (t) => {
  const { store } = storeFixture(t);
  store.add({ ...linear, auth: { kind: "oauth", clientId: "mine" } }, { clientSecret: "shh" });
  store.updateSecrets(linear.id, { tokens: { tokens: { access_token: "a", token_type: "Bearer" }, savedAt: 1 } });
  assert.equal(store.secrets(linear.id).clientSecret, "shh");
  store.updateSecrets(linear.id, { tokens: undefined });
  assert.deepEqual(store.secrets(linear.id), { clientSecret: "shh" });
  store.update(linear.id, { enabled: false });
  assert.equal(store.get(linear.id)?.enabled, false);
  store.remove(linear.id);
  assert.deepEqual(store.list(), []);
  assert.throws(() => store.update(linear.id, { enabled: true }), /no longer exists/);
});

test("unreadable files and secrets degrade to an empty list or a needed sign-in, not a crash", (t) => {
  const { store, path, reopen } = storeFixture(t);
  store.add(linear, { headerValue: "kept" });
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { connectors: { secrets: string }[] };
  parsed.connectors[0]!.secrets = "not-decryptable";
  writeFileSync(path, JSON.stringify(parsed));
  assert.deepEqual(reopen().secrets(linear.id), {});
  writeFileSync(path, "{ broken");
  assert.deepEqual(reopen().list(), []);
});

test("connectors saved before access existed, or with an unreadable rule, reach every thread", (t) => {
  const { store, path, reopen } = storeFixture(t);
  store.add({ ...linear, access: { workspaces: { kind: "only", ids: ["w"] }, bots: { kind: "all" } } }, {});
  assert.deepEqual(reopen().get(linear.id)?.access.workspaces, { kind: "only", ids: ["w"] });
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { connectors: Record<string, unknown>[] };
  delete parsed.connectors[0]!.access;
  writeFileSync(path, JSON.stringify(parsed));
  assert.deepEqual(reopen().get(linear.id)?.access, CONNECTOR_ACCESS_ALL);
  parsed.connectors[0]!.access = { workspaces: { kind: "only", ids: [] }, bots: { kind: "all" } };
  writeFileSync(path, JSON.stringify(parsed));
  assert.deepEqual(reopen().get(linear.id)?.access, CONNECTOR_ACCESS_ALL);
});
