import assert from "node:assert/strict";
import test from "node:test";
import { createConnectorCredentials } from "@main/connectors/credentials";
import { ConnectorOAuthClient } from "@main/connectors/oauthClient";
import type { StoredConnector } from "@main/types/connectors/connectors.types";
import { CONNECTOR_ACCESS_ALL } from "@shared/connectors/access";
import { storeFixture } from "./fixture";

function fixture(t: test.TestContext, status: number, retryAfter?: string, errorCode = status === 429 ? "too_many_requests" : "temporarily_unavailable") {
  const { store, reopen } = storeFixture(t);
  t.mock.method(console, "warn", () => {});
  const url = "https://mcp.example.com/mcp";
  const issuer = "https://mcp.example.com";
  const connector: StoredConnector = { id: "7f0c1e1a-3c1b-4c55-9a59-6f1f6e1f2a01", name: "Test", serverName: "test",
    url, auth: { kind: "oauth" }, enabled: true, access: CONNECTOR_ACCESS_ALL };
  let time = Date.parse("2026-11-24T12:00:00Z");
  let requests = 0;
  store.add(connector, {
    client: { information: { client_id: "client", issuer }, redirectUri: "http://127.0.0.1/callback" },
    tokens: { tokens: { access_token: "expired", refresh_token: "refresh", token_type: "Bearer", expires_in: 3600, issuer }, savedAt: 0 },
    discovery: { authorizationServerUrl: issuer, resourceMetadata: { resource: url, authorization_servers: [issuer] },
      authorizationServerMetadata: { issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`,
        response_types_supported: ["code"], code_challenge_methods_supported: ["S256"], token_endpoint_auth_methods_supported: ["none"] } }
  });
  const fetchFn: typeof fetch = async (input) => {
    assert.equal(String(input), `${issuer}/token`);
    requests += 1;
    return new Response(JSON.stringify(status === 200 ? { access_token: "renewed", refresh_token: "new-refresh", token_type: "Bearer", expires_in: 3600 }
      : { error: errorCode, error_description: "Refresh refused" }),
    { status, headers: { "content-type": "application/json", ...(retryAfter ? { "retry-after": retryAfter } : {}) } });
  };
  const credentials = createConnectorCredentials({ store, now: () => time, fetch: fetchFn });
  return { store, connector, read: (forceRefresh = false) => credentials(connector, { forceRefresh }), requests: () => requests,
    advance: (ms: number) => { time += ms; }, reopenCredentials: () => createConnectorCredentials({ store: reopen(), now: () => time, fetch: fetchFn }) };
}

test("60 sequential requests after a 429 make one token request and respect Retry-After", async (t) => {
  const f = fixture(t, 429, "900");
  for (let i = 0; i < 60; i += 1) assert.equal(await f.read(), null);
  assert.equal(f.requests(), 1);
  f.advance(899_999);
  assert.equal(await f.read(true), null);
  assert.equal(f.requests(), 1);
  f.advance(1);
  await f.read();
  assert.equal(f.requests(), 2);
});

test("Retry-After dates are respected and 429 without a header waits fifteen minutes", async (t) => {
  for (const retryAfter of ["Tue, 24 Nov 2026 12:15:00 GMT", undefined]) {
    const f = fixture(t, 429, retryAfter);
    await f.read();
    f.advance(60_000);
    await f.read();
    assert.equal(f.requests(), 1);
    f.advance(840_000);
    await f.read();
    assert.equal(f.requests(), 2);
  }
});

test("other failed refreshes have a cooldown and concurrent callers share the attempt", async (t) => {
  const f = fixture(t, 503);
  await Promise.all(Array.from({ length: 20 }, () => f.read()));
  assert.equal(f.requests(), 1);
  await f.read();
  assert.equal(f.requests(), 1);
  f.advance(60_000);
  await f.read();
  assert.equal(f.requests(), 2);
});

test("new sign-in credentials supersede a failed refresh cooldown", async (t) => {
  const f = fixture(t, 429, "900");
  await f.read();
  f.store.updateSecrets(f.connector.id, { tokens: { tokens: { access_token: "signed-in", token_type: "Bearer", expires_in: 3600 }, savedAt: Date.parse("2026-11-24T12:00:00Z") } });
  assert.deepEqual(await f.read(), { Authorization: "Bearer signed-in" });
  assert.equal(f.requests(), 1);
});

test("a successful refresh remains shared and later requests use the renewed token", async (t) => {
  const f = fixture(t, 200);
  const replies = await Promise.all(Array.from({ length: 20 }, () => f.read()));
  assert.ok(replies.every((headers) => headers?.Authorization === "Bearer renewed"));
  assert.deepEqual(await f.read(), { Authorization: "Bearer renewed" });
  assert.equal(f.requests(), 1);
});

test("permanent OAuth failures stop all requests until sign-in, including after restarting", async (t) => {
  for (const code of ["invalid_grant", "invalid_client", "unauthorized_client", "access_denied", "invalid_scope"]) {
    const f = fixture(t, 400, undefined, code);
    assert.equal(await f.read(), null);
    assert.equal(f.store.secrets(f.connector.id).requiresSignIn, true);
    assert.equal(f.store.secrets(f.connector.id).tokens, undefined);
    f.advance(24 * 60 * 60_000);
    for (let i = 0; i < 20; i += 1) assert.equal(await f.read(true), null);
    const restarted = f.reopenCredentials();
    assert.equal(await restarted(f.connector, { forceRefresh: false }), null);
    assert.equal(f.requests(), 1, "no registration, rediscovery or token retry after rejection");
  }
});

test("explicit sign-in tokens clear a permanent failure and make the connector usable", async (t) => {
  const f = fixture(t, 400, undefined, "invalid_grant");
  await f.read();
  new ConnectorOAuthClient(f.store, f.connector, { redirectUrl: "http://127.0.0.1/callback" }, () => Date.parse("2026-11-24T12:00:00Z"))
    .saveTokens({ access_token: "signed-in", token_type: "Bearer", expires_in: 3600 });
  assert.equal(f.store.secrets(f.connector.id).requiresSignIn, undefined);
  assert.deepEqual(await f.read(), { Authorization: "Bearer signed-in" });
  assert.equal(f.requests(), 1);
});

test("server errors remain temporary without falling back to browser authorization", async (t) => {
  const f = fixture(t, 500, undefined, "server_error");
  await f.read();
  assert.equal(f.store.secrets(f.connector.id).requiresSignIn, undefined);
  await f.read();
  assert.equal(f.requests(), 1);
  f.advance(60_000);
  await f.read();
  assert.equal(f.requests(), 2);
});

test("credentials without a refresh token require sign-in without contacting the server", async (t) => {
  const f = fixture(t, 200);
  f.store.updateSecrets(f.connector.id, { tokens: { tokens: { access_token: "expired", token_type: "Bearer", expires_in: 3600 }, savedAt: 0 } });
  assert.equal(await f.read(), null);
  assert.equal(f.store.secrets(f.connector.id).requiresSignIn, true);
  assert.equal(f.requests(), 0);
});

test("credentials bound to another issuer are never sent to the discovered token endpoint", async (t) => {
  const f = fixture(t, 200);
  f.store.updateSecrets(f.connector.id, { tokens: { tokens: { access_token: "expired", refresh_token: "refresh", token_type: "Bearer", expires_in: 3600,
    issuer: "https://other.example.com" }, savedAt: 0 } });
  assert.equal(await f.read(), null);
  assert.equal(f.store.secrets(f.connector.id).requiresSignIn, true);
  assert.equal(f.requests(), 0);
});
