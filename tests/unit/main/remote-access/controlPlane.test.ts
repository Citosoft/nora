import assert from "node:assert/strict";
import test from "node:test";
import { createRemoteControlPlane } from "@main/remote-access/controlPlane";
import { mintSessionToken } from "@main/account/sessionToken";
import { createClerkNativeClient } from "@main/account/clerkClient";

const session = { userId: "owner", sessionId: "session" };

test("control plane receives a short-lived session JWT, validated runtime response and idempotent cleanup", async () => {
  let calls = 0;
  const client = createRemoteControlPlane({ origin: "https://remote-api.withnora.run", sessionToken: async (expected) => { assert.deepEqual(expected, session); return "session-jwt"; },
    fetch: async (input, init) => {
      const request = new Request(input, init); calls += 1;
      assert.equal(request.headers.get("Authorization"), "Bearer session-jwt");
      if (request.method === "DELETE") return Response.json({ error: { code: "not-found", message: "Missing" } }, { status: 404 });
      assert.equal(new URL(request.url).pathname, "/v1/runtimes/provision");
      return Response.json({ runtime: { installationId: "installation-123456", name: "Desktop", environment: "desktop", hostname: "device.remote.withnora.run", tunnelId: "tunnel", registeredAt: "2026-11-16T10:00:00Z" }, connectorToken: "connector" });
    } });
  assert.equal((await client.provision(session, { installationId: "installation-123456", name: "Desktop", environment: "desktop", port: 43000 }, new AbortController().signal)).connectorToken, "connector");
  await client.remove(session, "installation-123456", new AbortController().signal); assert.equal(calls, 2);
});

test("control plane sends phone pushes and surfaces its error message", async () => {
  const bodies: unknown[] = [];
  let fail = false;
  const client = createRemoteControlPlane({ origin: "https://remote-api.withnora.run", sessionToken: async () => "session-jwt",
    fetch: async (input, init) => {
      const request = new Request(input, init);
      assert.equal(request.method, "POST"); assert.equal(new URL(request.url).pathname, "/v1/push/send");
      assert.equal(request.headers.get("Authorization"), "Bearer session-jwt"); assert.equal(request.headers.get("Origin"), null);
      bodies.push(await request.json());
      return fail ? Response.json({ error: { code: "not-found", message: "Runtime not found." } }, { status: 404 }) : Response.json({ delivered: 2 });
    } });
  const input = { installationId: "installation-123456", notifications: [{ kind: "needs-you" as const, id: "request:1", title: "Rex needs you", body: "Run npm test?", target: { kind: "thread" as const, conversationId: "c" } }] };
  assert.deepEqual(await client.sendPush(session, input, new AbortController().signal), { delivered: 2 });
  assert.deepEqual(bodies, [input]);
  fail = true;
  await assert.rejects(client.sendPush(session, input, new AbortController().signal), /Runtime not found/);
});

test("native client token stays at Clerk while minting a selected session JWT", async () => {
  let saved = "";
  const client = createClerkNativeClient({ host: "account.clerk.accounts.dev", session: () => session,
    tokens: { getItem: () => "native-client-secret", setItem(_key, value) { saved = value; }, removeItem() {} },
    fetch: async (input, init) => {
      const request = new Request(input, init); const url = new URL(request.url);
      assert.equal(url.pathname, "/v1/client/sessions/session/tokens"); assert.equal(request.method, "POST");
      assert.equal(request.headers.get("Authorization"), "Bearer native-client-secret");
      assert.equal(url.searchParams.has("_clerk_session_id"), false);
      assert.equal(url.searchParams.get("_is_native"), "1");
      return Response.json({ object: "token", jwt: "short-lived-session-jwt" }, { headers: { Authorization: "Bearer refreshed-native-token" } });
    }
  });
  assert.equal(await mintSessionToken(client, session, new AbortController().signal), "short-lived-session-jwt");
  assert.equal(saved, "refreshed-native-token");
});
