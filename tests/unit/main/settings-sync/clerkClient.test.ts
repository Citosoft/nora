import assert from "node:assert/strict";
import { test } from "node:test";
import { createClerkSyncClient } from "@main/settings-sync/clerkClient";
import type { SyncSession } from "@main/types/settings-sync/client.types";

test("native metadata requests use the encrypted client token, selected session and current API version", async () => {
  const session = { userId: "user-a", sessionId: "session-a" };
  let token = "native-client-token";
  const client = createClerkSyncClient({ host: "example.clerk.accounts.dev", session: () => session,
    tokens: { getItem: () => token, setItem: (_key, next) => { token = next; }, removeItem() {} },
    fetch: async (input, init) => {
      const request = new Request(input, init); const url = new URL(request.url);
      assert.equal(url.pathname, "/v1/me"); assert.equal(url.searchParams.get("_is_native"), "1");
      assert.equal(url.searchParams.get("_clerk_session_id"), "session-a"); assert.equal(url.searchParams.get("__clerk_api_version"), "2026-05-12");
      assert.equal(request.headers.get("Authorization"), "Bearer native-client-token"); assert.equal(request.headers.has("Origin"), false);
      return Response.json({ response: { id: "user-a", unsafe_metadata: {} } }, { headers: { Authorization: "Bearer refreshed-client-token" } });
    }
  });
  assert.equal(await client.read(session, new AbortController().signal), null);
  assert.equal(token, "refreshed-client-token");
});
test("an account switch discards a late response and cannot replace the new account's token", async () => {
  let active: SyncSession | null = { userId: "user-a", sessionId: "session-a" };
  let saved = false;
  const client = createClerkSyncClient({ host: "example.clerk.accounts.dev", session: () => active,
    tokens: { getItem: () => "token", setItem: () => { saved = true; }, removeItem() {} },
    fetch: async () => { active = null; return Response.json({ response: { id: "user-a", unsafe_metadata: {} } }, { headers: { Authorization: "late-token" } }); }
  });
  await assert.rejects(client.read(active, new AbortController().signal), /account changed/); assert.equal(saved, false);
});
test("a response for a different user is never normalized into settings", async () => {
  const session = { userId: "user-a", sessionId: "session-a" };
  const client = createClerkSyncClient({ host: "example.clerk.accounts.dev", session: () => session,
    tokens: { getItem: () => "token", setItem() {}, removeItem() {} },
    fetch: async () => Response.json({ response: { id: "user-b", unsafe_metadata: {} } }) });
  await assert.rejects(client.read(session, new AbortController().signal), /verify your account/);
});
test("metadata writes patch only Nora's revision keys using form encoding", async () => {
  const session = { userId: "user-a", sessionId: "session-a" }; let requests = 0;
  const client = createClerkSyncClient({ host: "example.clerk.accounts.dev", session: () => session,
    tokens: { getItem: () => "token", setItem() {}, removeItem() {} },
    fetch: async (input, init) => {
      requests++; const request = new Request(input, init);
      if (request.method === "GET") return Response.json({ response: { id: "user-a", unsafe_metadata: { anotherApp: "preserved" } } });
      assert.equal(new URL(request.url).pathname, "/v1/me/metadata");
      assert.equal(request.headers.get("Content-Type"), "application/x-www-form-urlencoded");
      const patch: unknown = JSON.parse(new URLSearchParams(await request.text()).get("unsafe_metadata") ?? "{}");
      const expected = { noraSettingsSync: { version: 2, entries: { threadModel: { "1:a": { value: "null", updatedAt: 1, deviceId: "a" } } } } };
      assert.deepEqual(patch, expected);
      return Response.json({ response: { id: "user-a", unsafe_metadata: { anotherApp: "preserved", ...expected } } });
    }
  });
  const result = await client.write(session, { threadModel: { value: "null", updatedAt: 1, deviceId: "a" } }, new AbortController().signal);
  assert.equal(result.entries.threadModel?.value, "null"); assert.equal(requests, 2);
});
test("reading the original cloud format migrates it before returning settings", async () => {
  const session = { userId: "user-a", sessionId: "session-a" }; let migrated = false;
  const saved = { value: '"dark"', updatedAt: 100, deviceId: "old-device" };
  const client = createClerkSyncClient({ host: "example.clerk.accounts.dev", session: () => session,
    tokens: { getItem: () => "token", setItem() {}, removeItem() {} },
    fetch: async (input, init) => {
      const request = new Request(input, init);
      if (request.method === "GET") return Response.json({ response: { id: "user-a", unsafe_metadata: { noraSettingsSync: { version: 1, entries: { themeMode: saved } } } } });
      const patch: unknown = JSON.parse(new URLSearchParams(await request.text()).get("unsafe_metadata") ?? "{}");
      assert.deepEqual(patch, { noraSettingsSync: { version: 2, entries: { themeMode: { "2s:old-device": saved, value: null, updatedAt: null, deviceId: null } } } });
      migrated = true;
      return Response.json({ response: { id: "user-a", unsafe_metadata: { noraSettingsSync: { version: 2, entries: { themeMode: { "2s:old-device": saved } } } } } });
    }
  });
  assert.equal((await client.read(session, new AbortController().signal))?.entries.themeMode?.value, '"dark"');
  assert.equal(migrated, true);
});
