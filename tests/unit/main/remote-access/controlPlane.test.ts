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
