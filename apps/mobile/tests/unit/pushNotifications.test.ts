import { describe, expect, it } from "vitest";
import type { RegisterPushDeviceRequest } from "@shared/types/remote-access/push.types";
import { createDirectoryClient } from "@/api/directory/directoryClient";
import { RemoteRequestError } from "@/api/http/remoteRequestError";
import { createPushDeviceStore } from "@/push/pushDeviceStore";
import { createPushRegistration } from "@/push/pushRegistration";
import { pushTapHref } from "@/push/pushTaps";
import { presentPushStatus, shouldOfferPushPrompt } from "@/state/pushNotificationStatus";
import type { PushNotificationsPlatform, PushPermission } from "@/types/pushNotifications.types";
import type { KeyValueStorage } from "@/types/storage.types";
import { fakeFetch, json } from "./fixtures/fakeFetch";
import { memoryStorage } from "./fixtures/memoryStorage";

const INSTALL = "install-1111111111111111";
const TOKEN_1 = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
const TOKEN_2 = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]";
const DEVICE_ID = "device-0123456789abcdef";

function fakePlatform(permission: PushPermission = "granted", afterRequest: PushPermission = permission) {
  const state = { permission, token: TOKEN_1, requests: 0 };
  const platform: PushNotificationsPlatform = {
    platform: "ios",
    configure: () => undefined,
    getPermission: async () => state.permission,
    requestPermission: async () => { state.requests += 1; state.permission = afterRequest; return afterRequest; },
    getToken: async () => state.token,
    onTokenChange: () => () => undefined,
    onTap: () => () => undefined
  };
  return { platform, state };
}

function fakeDirectory() {
  const registered: RegisterPushDeviceRequest[] = [];
  const removed: string[] = [];
  let removeError: Error | null = null;
  return {
    registered, removed,
    failRemoveWith(error: Error) { removeError = error; },
    client: {
      async registerPushDevice(request: RegisterPushDeviceRequest) {
        registered.push(request);
        return { deviceId: request.deviceId, platform: request.platform, registeredAt: "2026-11-25T10:00:00.000Z" };
      },
      async removePushDevice(deviceId: string) {
        removed.push(deviceId);
        if (removeError) throw removeError;
      }
    }
  };
}

function setup(options: { permission?: PushPermission; afterRequest?: PushPermission; userId?: string; storage?: KeyValueStorage } = {}) {
  const storage = options.storage ?? memoryStorage();
  const { platform, state } = fakePlatform(options.permission, options.afterRequest);
  const directory = fakeDirectory();
  const store = createPushDeviceStore({ storage, createId: () => DEVICE_ID });
  const push = createPushRegistration({ userId: options.userId ?? "user_a", platform, directory: directory.client, store });
  return { push, platform, state, directory, store, storage };
}

describe("push device store", () => {
  it("creates a stable device ID once and keeps it", async () => {
    const storage = memoryStorage();
    let ids = 0;
    const store = createPushDeviceStore({ storage, createId: () => `device-${String(++ids).padStart(16, "0")}` });
    const first = await store.load();
    expect(await store.load()).toEqual(first);
    expect(first).toEqual({ deviceId: "device-0000000000000001", registered: null });
  });

  it("replaces an unreadable record", async () => {
    const storage = memoryStorage({ "nora.pushDevice.v1": "{nope" });
    expect((await createPushDeviceStore({ storage, createId: () => DEVICE_ID }).load()).deviceId).toBe(DEVICE_ID);
  });
});

describe("push registration", () => {
  it("registers when enabled and permitted, and skips repeat requests with the same token", async () => {
    const t = setup();
    expect(await t.push.sync(true)).toEqual({ kind: "registered" });
    expect(await t.push.sync(true)).toEqual({ kind: "registered" });
    expect(t.directory.registered).toEqual([{ deviceId: DEVICE_ID, token: TOKEN_1, platform: "ios" }]);
    expect(await t.store.load()).toEqual({ deviceId: DEVICE_ID, registered: { userId: "user_a", token: TOKEN_1 } });
  });

  it("re-registers when the token changes", async () => {
    const t = setup();
    await t.push.sync(true);
    t.state.token = TOKEN_2;
    await t.push.sync(true);
    expect(t.directory.registered.map((request) => request.token)).toEqual([TOKEN_1, TOKEN_2]);
  });

  it("registers again after a relaunch even with the stored token, in case the Worker pruned it", async () => {
    const storage = memoryStorage();
    await setup({ storage }).push.sync(true);
    const relaunched = setup({ storage });
    await relaunched.push.sync(true);
    expect(relaunched.directory.registered).toHaveLength(1);
  });

  it("does not register or prompt without permission during a background sync", async () => {
    const undetermined = setup({ permission: "undetermined" });
    expect(await undetermined.push.sync(true)).toEqual({ kind: "permission-needed" });
    const denied = setup({ permission: "denied" });
    expect(await denied.push.sync(true)).toEqual({ kind: "denied" });
    expect(undetermined.state.requests + denied.state.requests).toBe(0);
    expect(undetermined.directory.registered).toEqual([]);
  });

  it("asks for permission when turned on, and registers only if granted", async () => {
    const granted = setup({ permission: "undetermined", afterRequest: "granted" });
    expect(await granted.push.enable()).toEqual({ kind: "registered" });
    expect(granted.state.requests).toBe(1);
    const refused = setup({ permission: "undetermined", afterRequest: "denied" });
    expect(await refused.push.enable()).toEqual({ kind: "denied" });
    expect(refused.directory.registered).toEqual([]);
  });

  it("unregisters when turned off, tolerating a device the Worker already forgot", async () => {
    const t = setup();
    await t.push.sync(true);
    t.directory.failRemoveWith(new RemoteRequestError("directory", { kind: "api", status: 404, code: "not-found", message: "Device not found." }));
    expect(await t.push.sync(false)).toEqual({ kind: "off" });
    expect(t.directory.removed).toEqual([DEVICE_ID]);
    expect((await t.store.load()).registered).toBeNull();
    expect(await t.push.sync(false)).toEqual({ kind: "off" });
    expect(t.directory.removed).toHaveLength(1);
  });

  it("reports other failures without throwing and keeps the record for a retry", async () => {
    const t = setup();
    await t.push.sync(true);
    t.directory.failRemoveWith(new RemoteRequestError("directory", { kind: "network", message: "offline" }));
    expect((await t.push.sync(false)).kind).toBe("failed");
    expect((await t.store.load()).registered).not.toBeNull();
  });

  it("unregisters on sign-out best-effort and only for its own account", async () => {
    const storage = memoryStorage();
    await setup({ storage, userId: "user_a" }).push.sync(true);
    const other = setup({ storage, userId: "user_b" });
    await other.push.unregister();
    expect(other.directory.removed).toEqual([]);
    expect((await other.store.load()).registered).toBeNull();

    const own = setup();
    await own.push.sync(true);
    own.directory.failRemoveWith(new Error("offline"));
    await expect(own.push.unregister()).resolves.toBeUndefined();
  });

  it("does nothing where push is unsupported", async () => {
    const t = setup();
    const unsupported = createPushRegistration({ userId: "user_a", platform: { ...t.platform, platform: null }, directory: t.directory.client, store: t.store });
    expect(await unsupported.sync(true)).toEqual({ kind: "unsupported" });
    expect(await unsupported.enable()).toEqual({ kind: "unsupported" });
    expect(t.directory.registered).toEqual([]);
  });
});

describe("directory client push routes", () => {
  it("registers and removes devices on the control plane", async () => {
    const { fetch, calls } = fakeFetch(
      () => json(200, { device: { deviceId: DEVICE_ID, platform: "android", registeredAt: "2026-11-25T10:00:00.000Z" } }),
      () => json(200, { deleted: true, deviceId: DEVICE_ID })
    );
    const client = createDirectoryClient({ baseUrl: "https://remote-api.example.test", fetch, timeoutMs: 100, getToken: async () => "clerk-token" });
    expect((await client.registerPushDevice({ deviceId: DEVICE_ID, token: TOKEN_1, platform: "android" })).platform).toBe("android");
    await client.removePushDevice(DEVICE_ID);
    expect(calls.map((call) => [call.method, call.url, call.body])).toEqual([
      ["POST", "https://remote-api.example.test/v1/push/devices", { deviceId: DEVICE_ID, token: TOKEN_1, platform: "android" }],
      ["DELETE", `https://remote-api.example.test/v1/push/devices/${DEVICE_ID}`, undefined]
    ]);
    expect(calls[0]?.headers.Authorization).toBe("Bearer clerk-token");
  });
});

describe("notification taps", () => {
  const data = (target: unknown) => ({ v: 1, installationId: INSTALL, kind: "finished", id: "outcome:c:r", target });

  it("opens the thread on that computer, or its inbox", () => {
    expect(pushTapHref(data({ kind: "thread", conversationId: "conv 1" }))).toBe(`/runtimes/${INSTALL}/conversations/conv%201`);
    expect(pushTapHref(data({ kind: "inbox" }))).toBe(`/runtimes/${INSTALL}/inbox`);
  });

  it("ignores anything that is not a Nora notification", () => {
    expect(pushTapHref(null)).toBeNull();
    expect(pushTapHref({ ...data({ kind: "inbox" }), v: 2 })).toBeNull();
    expect(pushTapHref(data({ kind: "workflow" }))).toBeNull();
  });
});

describe("notification setting presentation", () => {
  it("shows on only when registered, and offers Settings after a refusal", () => {
    expect(presentPushStatus(true, { kind: "registered" })).toMatchObject({ on: true, openSettings: false });
    expect(presentPushStatus(true, { kind: "denied" })).toMatchObject({ on: false, openSettings: true });
    expect(presentPushStatus(false, { kind: "off" }).on).toBe(false);
    expect(presentPushStatus(true, { kind: "failed", message: "Offline" }).footer).toContain("Offline");
  });
});

describe("home-screen notification prompt", () => {
  const base = { supported: true, enabled: false, status: { kind: "off" } as const, dismissed: false, linkedComputers: 1 };

  it("is offered once a computer is linked while notifications are off and the OS can still ask", () => {
    expect(shouldOfferPushPrompt(base)).toBe(true);
    expect(shouldOfferPushPrompt({ ...base, status: { kind: "permission-needed" } })).toBe(true);
  });

  it("is not offered when answered, already on, refused, unsupported or with nothing linked", () => {
    expect(shouldOfferPushPrompt({ ...base, dismissed: true })).toBe(false);
    expect(shouldOfferPushPrompt({ ...base, enabled: true, status: { kind: "registered" } })).toBe(false);
    expect(shouldOfferPushPrompt({ ...base, status: { kind: "denied" } })).toBe(false);
    expect(shouldOfferPushPrompt({ ...base, supported: false, status: { kind: "unsupported" } })).toBe(false);
    expect(shouldOfferPushPrompt({ ...base, linkedComputers: 0 })).toBe(false);
  });
});
