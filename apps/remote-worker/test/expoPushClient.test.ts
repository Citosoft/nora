import { describe, expect, it } from "vitest";
import { UpstreamError } from "../src/errors/upstreamError";
import { createExpoPushClient, EXPO_PUSH_SEND_URL } from "../src/expo/pushClient";
import { chunk } from "../src/push/messages";
import type { ExpoPushMessage } from "../src/types/push.types";

const message: ExpoPushMessage = {
  to: "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]",
  title: "Fix the build",
  body: "Finished",
  data: { v: 1, installationId: "install-1111111111111111", kind: "finished", id: "item-1", target: { kind: "inbox" } },
  sound: "default",
  priority: "high",
  channelId: "default"
};

function clientReturning(status: number, body: unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const client = createExpoPushClient({
    accessToken: "expo-secret",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    }
  });
  return { client, calls };
}

describe("Expo push client", () => {
  it("posts the messages with the access token and normalises tickets", async () => {
    const { client, calls } = clientReturning(200, { data: [
      { status: "ok", id: "ticket-1" },
      { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } },
      { status: "error", message: "too big", details: { error: "MessageTooBig" } }
    ] });
    const tickets = await client.send([message, message, message]);
    expect(tickets).toEqual([{ kind: "ok" }, { kind: "error", deviceNotRegistered: true }, { kind: "error", deviceNotRegistered: false }]);
    expect(calls[0]?.url).toBe(EXPO_PUSH_SEND_URL);
    expect(new Headers(calls[0]?.init.headers).get("Authorization")).toBe("Bearer expo-secret");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual([message, message, message]);
  });

  it.each([
    ["an HTTP error", 500, { errors: [{ code: "INTERNAL", message: "ExponentPushToken[aaaa]" }] }],
    ["a ticket count mismatch", 200, { data: [] }],
    ["an unexpected shape", 200, { nope: true }]
  ])("throws an upstream error for %s", async (_label, status, body) => {
    const { client } = clientReturning(status, body);
    const error = await client.send([message]).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UpstreamError);
    expect(error instanceof Error ? error.message : "").not.toContain("ExponentPushToken");
  });

  it("refuses chunks over 100 messages and skips empty ones", async () => {
    const { client, calls } = clientReturning(200, { data: [] });
    expect(await client.send([])).toEqual([]);
    await expect(client.send(Array.from({ length: 101 }, () => message))).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  it("chunks into groups of at most the given size", () => {
    expect(chunk(Array.from({ length: 205 }, (_, index) => index), 100).map((group) => group.length)).toEqual([100, 100, 5]);
  });
});
