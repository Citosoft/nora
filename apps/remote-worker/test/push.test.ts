import { directoryErrorSchema } from "@shared/remote-access/directory";
import { PUSH_LIMITS, PUSH_ROUTES, pushDeviceResponseSchema, pushPayloadDataSchema, sendPushResponseSchema } from "@shared/remote-access/push";
import { describe, expect, it } from "vitest";
import { PUSH_DEVICES_METADATA_KEY, parsePushDevices } from "../src/clerk/pushDeviceStore";
import type { Harness } from "./types/harness.types";
import { apiRequest, createHarness, INSTALL_1, INSTALL_2, provisionBody, TOKENS, USER_A, WEB_ORIGIN } from "./fakes/harness";

const PHONE_1 = "phone-1111111111111111";
const PHONE_2 = "phone-2222222222222222";
const TOKEN_1 = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
const TOKEN_2 = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]";

function registerBody(deviceId: string, token: string, platform: "ios" | "android" = "ios"): Record<string, unknown> {
  return { deviceId, token, platform };
}

function notification(id: string, target: Record<string, unknown> = { kind: "thread", conversationId: "conv-1" }): Record<string, unknown> {
  return { kind: "finished", id, title: "Fix the build", body: "Finished", target };
}

function sendBody(notifications: Record<string, unknown>[] = [notification("item-1")], installationId = INSTALL_1): Record<string, unknown> {
  return { installationId, notifications };
}

async function errorCode(response: Response): Promise<string> {
  return directoryErrorSchema.parse(await response.json()).error.code;
}

async function register(h: Harness, deviceId: string, token: string, userToken: string = TOKENS.userA): Promise<Response> {
  return h.handle(apiRequest("POST", PUSH_ROUTES.devices, { token: userToken, body: registerBody(deviceId, token) }));
}

async function storedDevices(h: Harness, userId = USER_A) {
  return parsePushDevices(await h.clerk.readPrivateMetadata(userId)).entries;
}

async function provisionedHarness(): Promise<Harness> {
  const h = createHarness();
  await h.handle(apiRequest("POST", "/v1/runtimes/provision", { body: provisionBody(INSTALL_1) }));
  return h;
}

describe("push device registration", () => {
  it("registers a device without returning its token", async () => {
    const h = createHarness();
    const response = await register(h, PHONE_1, TOKEN_1);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain(TOKEN_1);
    expect(pushDeviceResponseSchema.parse(JSON.parse(text)).device).toEqual({
      deviceId: PHONE_1, platform: "ios", registeredAt: "2026-11-16T10:00:00.000Z"
    });
    expect(await storedDevices(h)).toEqual([{ deviceId: PHONE_1, platform: "ios", registeredAt: "2026-11-16T10:00:00.000Z", token: TOKEN_1 }]);
  });

  it("upserts by device ID, keeping the first registration time", async () => {
    const h = createHarness();
    await register(h, PHONE_1, TOKEN_1);
    h.tick();
    await register(h, PHONE_1, TOKEN_2);
    expect(await storedDevices(h)).toEqual([{ deviceId: PHONE_1, platform: "ios", registeredAt: "2026-11-16T10:00:00.000Z", token: TOKEN_2 }]);
  });

  it("moves a token already held by another device ID to the new one", async () => {
    const h = createHarness();
    await register(h, PHONE_1, TOKEN_1);
    await register(h, PHONE_2, TOKEN_1);
    expect((await storedDevices(h)).map((device) => device.deviceId)).toEqual([PHONE_2]);
  });

  it("enforces the per-account device limit with quota, but lets existing devices re-register", async () => {
    const h = createHarness();
    for (let index = 0; index < PUSH_LIMITS.maxDevicesPerUser; index += 1) {
      const id = `phone-${String(index).padStart(16, "0")}`;
      expect((await register(h, id, `ExponentPushToken[token${index}]`)).status).toBe(200);
    }
    const over = await register(h, PHONE_1, TOKEN_1);
    expect(over.status).toBe(409);
    expect(await errorCode(over)).toBe("quota");
    expect((await register(h, "phone-0000000000000000", TOKEN_2)).status).toBe(200);
  });

  it("allows a full account to register when the token moves from one of its devices", async () => {
    const h = createHarness();
    for (let index = 0; index < PUSH_LIMITS.maxDevicesPerUser; index += 1) {
      await register(h, `phone-${String(index).padStart(16, "0")}`, `ExponentPushToken[token${index}]`);
    }
    expect((await register(h, PHONE_1, "ExponentPushToken[token3]")).status).toBe(200);
    expect(await storedDevices(h)).toHaveLength(PUSH_LIMITS.maxDevicesPerUser);
  });

  it.each([
    ["short device ID", registerBody("short", TOKEN_1)],
    ["non-Expo token", registerBody(PHONE_1, "fcm:abc")],
    ["web platform", { ...registerBody(PHONE_1, TOKEN_1), platform: "web" }],
    ["unknown field", { ...registerBody(PHONE_1, TOKEN_1), owner: "user_x" }]
  ])("returns 400 for %s", async (_label, body) => {
    const h = createHarness();
    const response = await h.handle(apiRequest("POST", PUSH_ROUTES.devices, { body }));
    expect(response.status).toBe(400);
    expect(h.clerk.merges).toBe(0);
  });

  it("keeps devices apart from the runtime directory", async () => {
    const h = await provisionedHarness();
    await register(h, PHONE_1, TOKEN_1);
    const metadata = await h.clerk.readPrivateMetadata(USER_A);
    expect(Object.keys(metadata as Record<string, unknown>).sort()).toEqual(["noraPushDevices", "noraRuntimes"]);
  });

  it("requires authentication", async () => {
    const response = await createHarness().handle(apiRequest("POST", PUSH_ROUTES.devices, { token: null, body: registerBody(PHONE_1, TOKEN_1) }));
    expect(response.status).toBe(401);
  });
});

describe("push device removal", () => {
  it("deletes the caller's device", async () => {
    const h = createHarness();
    await register(h, PHONE_1, TOKEN_1);
    const response = await h.handle(apiRequest("DELETE", PUSH_ROUTES.device(PHONE_1)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true, deviceId: PHONE_1 });
    expect(await storedDevices(h)).toEqual([]);
  });

  it("returns 404 for an unknown device or another account's device", async () => {
    const h = createHarness();
    await register(h, PHONE_1, TOKEN_1);
    const unknown = await h.handle(apiRequest("DELETE", PUSH_ROUTES.device(PHONE_2)));
    expect(unknown.status).toBe(404);
    const foreign = await h.handle(apiRequest("DELETE", PUSH_ROUTES.device(PHONE_1), { token: TOKENS.userB }));
    expect(foreign.status).toBe(404);
    expect(await storedDevices(h)).toHaveLength(1);
  });

  it("returns 400 for an invalid device ID and 405 for a wrong method", async () => {
    const h = createHarness();
    expect((await h.handle(apiRequest("DELETE", PUSH_ROUTES.device("bad id")))).status).toBe(400);
    const wrong = await h.handle(apiRequest("GET", PUSH_ROUTES.device(PHONE_1)));
    expect(wrong.status).toBe(405);
    expect(wrong.headers.get("Allow")).toBe("DELETE");
    expect((await h.handle(apiRequest("DELETE", `${PUSH_ROUTES.device(PHONE_1)}/extra`))).status).toBe(404);
  });
});

describe("push send", () => {
  it("sends one high-priority message per device per notification with the tap payload", async () => {
    const h = await provisionedHarness();
    await register(h, PHONE_1, TOKEN_1);
    await register(h, PHONE_2, TOKEN_2);
    const response = await h.handle(apiRequest("POST", PUSH_ROUTES.send, {
      body: sendBody([notification("item-1"), notification("item-2", { kind: "inbox" })])
    }));
    expect(response.status).toBe(200);
    expect(sendPushResponseSchema.parse(await response.json())).toEqual({ delivered: 4 });
    expect(h.expo.messages).toHaveLength(4);
    expect(h.expo.messages.map((message) => message.to)).toEqual([TOKEN_1, TOKEN_2, TOKEN_1, TOKEN_2]);
    const [first] = h.expo.messages;
    expect(first).toMatchObject({ title: "Fix the build", body: "Finished", sound: "default", priority: "high", channelId: "default" });
    expect(pushPayloadDataSchema.parse(first?.data)).toEqual({
      v: 1, installationId: INSTALL_1, kind: "finished", id: "item-1", target: { kind: "thread", conversationId: "conv-1" }
    });
    expect(h.limiter.calls.slice(-2)).toEqual([{ scope: "general", key: USER_A }, { scope: "push", key: USER_A }]);
  });

  it("fits a full fan-out (10 phones x 10 notifications) in one Expo request", async () => {
    const h = await provisionedHarness();
    for (let index = 0; index < PUSH_LIMITS.maxDevicesPerUser; index += 1) {
      await register(h, `phone-${String(index).padStart(16, "0")}`, `ExponentPushToken[token${index}]`);
    }
    const many = Array.from({ length: PUSH_LIMITS.maxNotificationsPerRequest }, (_, index) => notification(`item-${index}`));
    const response = await h.handle(apiRequest("POST", PUSH_ROUTES.send, { body: sendBody(many) }));
    expect(sendPushResponseSchema.parse(await response.json())).toEqual({ delivered: 100 });
    expect(h.expo.chunks.map((chunk) => chunk.length)).toEqual([100]);
  });

  it("prunes devices whose ticket says DeviceNotRegistered", async () => {
    const h = await provisionedHarness();
    await register(h, PHONE_1, TOKEN_1);
    await register(h, PHONE_2, TOKEN_2);
    h.expo.unregistered.add(TOKEN_1);
    const response = await h.handle(apiRequest("POST", PUSH_ROUTES.send, { body: sendBody() }));
    expect(sendPushResponseSchema.parse(await response.json())).toEqual({ delivered: 1 });
    expect((await storedDevices(h)).map((device) => device.deviceId)).toEqual([PHONE_2]);
  });

  it("delivers nothing when the account has no phones", async () => {
    const h = await provisionedHarness();
    const response = await h.handle(apiRequest("POST", PUSH_ROUTES.send, { body: sendBody() }));
    expect(sendPushResponseSchema.parse(await response.json())).toEqual({ delivered: 0 });
    expect(h.expo.chunks).toEqual([]);
  });

  it("requires the caller to own the installation", async () => {
    const h = await provisionedHarness();
    await register(h, PHONE_1, TOKEN_1);
    const unknown = await h.handle(apiRequest("POST", PUSH_ROUTES.send, { body: sendBody(undefined, INSTALL_2) }));
    expect(unknown.status).toBe(404);
    const foreign = await h.handle(apiRequest("POST", PUSH_ROUTES.send, { token: TOKENS.userB, body: sendBody() }));
    expect(foreign.status).toBe(404);
    expect(h.expo.chunks).toEqual([]);
  });

  it("refuses browser callers, even from an allowed origin", async () => {
    const h = await provisionedHarness();
    await register(h, PHONE_1, TOKEN_1);
    const response = await h.handle(apiRequest("POST", PUSH_ROUTES.send, { origin: WEB_ORIGIN, body: sendBody() }));
    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe("forbidden");
    expect(h.expo.chunks).toEqual([]);
  });

  it("returns 429 when the push limiter denies", async () => {
    const h = await provisionedHarness();
    h.limiter.denied.add("push");
    const response = await h.handle(apiRequest("POST", PUSH_ROUTES.send, { body: sendBody() }));
    expect(response.status).toBe(429);
  });

  it.each([
    ["no notifications", sendBody([])],
    ["too many notifications", sendBody(Array.from({ length: 11 }, (_, index) => notification(`item-${index}`)))],
    ["blank title", sendBody([{ ...notification("item-1"), title: "  " }])],
    ["unknown target", sendBody([notification("item-1", { kind: "workflow", workflowId: "w" })])]
  ])("returns 400 for %s", async (_label, body) => {
    const h = await provisionedHarness();
    const response = await h.handle(apiRequest("POST", PUSH_ROUTES.send, { body }));
    expect(response.status).toBe(400);
  });

  it("accepts a full batch at the contract's text limits", async () => {
    const h = await provisionedHarness();
    await register(h, PHONE_1, TOKEN_1);
    const big = Array.from({ length: PUSH_LIMITS.maxNotificationsPerRequest }, (_, index) => ({
      ...notification(`${index}-${"i".repeat(290)}`, { kind: "thread", conversationId: "c".repeat(200) }),
      title: "t".repeat(PUSH_LIMITS.titleMaxLength),
      body: "b".repeat(PUSH_LIMITS.bodyMaxLength)
    }));
    const response = await h.handle(apiRequest("POST", PUSH_ROUTES.send, { body: sendBody(big) }));
    expect(response.status).toBe(200);
  });

  it("maps an Expo failure to 502 without leaking tokens", async () => {
    const h = await provisionedHarness();
    await register(h, PHONE_1, TOKEN_1);
    h.expo.fail = true;
    const response = await h.handle(apiRequest("POST", PUSH_ROUTES.send, { body: sendBody() }));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(TOKEN_1);
    expect(await storedDevices(h)).toHaveLength(1);
  });

  it("without an Expo access token, fails only sending while registration and runtimes keep working", async () => {
    const h = createHarness({ expoConfigured: false });
    expect((await h.handle(apiRequest("POST", "/v1/runtimes/provision", { body: provisionBody(INSTALL_1) }))).status).toBe(200);
    expect((await register(h, PHONE_1, TOKEN_1)).status).toBe(200);
    const response = await h.handle(apiRequest("POST", PUSH_ROUTES.send, { body: sendBody() }));
    expect(response.status).toBe(500);
    expect(await errorCode(response)).toBe("internal");
    expect(await storedDevices(h)).toHaveLength(1);
  });

  it("stores devices under their own metadata key", () => {
    expect(PUSH_DEVICES_METADATA_KEY).toBe("noraPushDevices");
  });
});
