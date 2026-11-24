import { demoProviderOptions } from "@/demo/providerOptions";
import { describe, expect, it } from "vitest";
import { createRuntimeClient } from "@/api/runtime/runtimeClient";
import { RemoteRequestError } from "@/api/http/remoteRequestError";
import type { FetchLike } from "@/types/http.types";
import { detail } from "./fixtures/conversationFixtures";
import { fakeFetch, json, networkError } from "./fixtures/fakeFetch";

const info = { apiVersion: 1, runtimeVersion: "3.0.0", name: "Studio Mac", environment: "desktop", environmentId: "env-1",
  capabilities: ["conversations.read", "realtime"], cursor: 42 };

function client(fetch: FetchLike, tokens: (string | null)[] = ["token-1", "token-2", "token-3"]) {
  let index = 0;
  return createRuntimeClient({ hostname: "abc123.remote.withnora.run", fetch, timeoutMs: 50, commandTimeoutMs: 50,
    getToken: async () => tokens[Math.min(index++, tokens.length - 1)] ?? null });
}

async function failureOf(promise: Promise<unknown>): Promise<RemoteRequestError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RemoteRequestError) return error;
    throw error;
  }
  throw new Error("Expected the request to fail");
}

describe("runtimeClient", () => {
  it("reads and patches remote preferences through the validated management API", async () => {
    const settings = { automaticTitles: true, automaticMemory: false, followUp: "queue", toolOutputBudget: "compact" };
    const { fetch, calls } = fakeFetch(() => json(200, settings));
    const runtime = client(fetch);
    expect(await runtime.settings()).toEqual(settings);
    expect(await runtime.updateSettings({ automaticMemory: false })).toEqual(settings);
    expect(calls[1]).toMatchObject({ method: "POST", url: "https://abc123.remote.withnora.run/v1/settings", body: { automaticMemory: false } });
  });

  it("retains bot revisions and scope when sending a save and validates bot replies", async () => {
    const input = { id: "helper", name: "Helper", role: "Review", instructions: "Review work", avatar: { seed: 4 },
      scope: { kind: "global" as const }, revision: 3 };
    const { fetch, calls } = fakeFetch(() => json(200, { bots: [] }));
    const runtime = client(fetch);
    expect(await runtime.botSettings()).toEqual([]);
    expect(await runtime.saveBot(input)).toEqual([]);
    expect(calls[1]).toMatchObject({ method: "POST", url: "https://abc123.remote.withnora.run/v1/bot-settings", body: input });
    const invalid = fakeFetch(() => json(200, { bots: [{ id: "partial" }] }));
    expect((await failureOf(client(invalid.fetch).botSettings())).failure.kind).toBe("invalid-response");
  });

  it("sends a fresh bearer token with every request to the runtime origin", async () => {
    const { fetch, calls } = fakeFetch(() => json(200, info));
    const runtime = client(fetch);
    await runtime.info();
    await runtime.info();
    expect(calls.map((call) => call.url)).toEqual(["https://abc123.remote.withnora.run/v1/runtime/info", "https://abc123.remote.withnora.run/v1/runtime/info"]);
    expect(calls.map((call) => call.headers.Authorization)).toEqual(["Bearer token-1", "Bearer token-2"]);
  });

  it("names this device to the runtime only when it has a label", async () => {
    const { fetch, calls } = fakeFetch(() => json(200, info));
    await createRuntimeClient({ hostname: "abc123.remote.withnora.run", fetch, timeoutMs: 50, commandTimeoutMs: 50,
      getToken: async () => "token", clientLabel: "iPhone · Nora app" }).info();
    await client(fetch).info();
    expect(calls.map((call) => call.headers["X-Nora-Client"])).toEqual(["iPhone · Nora app", undefined]);
  });

  it("fails as signed-out without calling the runtime when no token is available", async () => {
    const { fetch, calls } = fakeFetch(() => json(200, info));
    const error = await failureOf(client(fetch, [null]).info());
    expect(error.failure.kind).toBe("signed-out");
    expect(calls).toHaveLength(0);
  });

  it("maps the runtime error envelope to a typed error with its code", async () => {
    const { fetch } = fakeFetch(() => json(409, { error: { code: "conflict", message: "That request was already answered." } }));
    const error = await failureOf(client(fetch).decideAction("req-1", { commandId: "c1", conversationId: "conv-1", response: { kind: "approval", optionId: "allow" } }));
    expect(error.code).toBe("conflict");
    expect(error.failure).toMatchObject({ kind: "api", status: 409 });
    expect(error.message).toBe("That request was already answered.");
  });

  it("turns a 401 envelope into a sign-in message", async () => {
    const { fetch } = fakeFetch(() => json(401, { error: { code: "unauthenticated", message: "Token expired" } }));
    const error = await failureOf(client(fetch).projects());
    expect(error.code).toBe("unauthenticated");
    expect(error.message).toMatch(/sign in again/i);
  });

  it("reports a non-envelope error page as an http failure", async () => {
    const { fetch } = fakeFetch(() => new Response("<html>Bad gateway</html>", { status: 502 }));
    const error = await failureOf(client(fetch).tasks());
    expect(error.failure).toEqual({ kind: "http", status: 502 });
  });

  it("rejects replies that do not match the contract", async () => {
    const { fetch } = fakeFetch(() => json(200, { ...info, apiVersion: "one" }));
    const error = await failureOf(client(fetch).info());
    expect(error.failure.kind).toBe("invalid-response");
  });

  it("rejects a conversation detail with an unknown timeline item kind", async () => {
    const bad = detail(5);
    const { fetch } = fakeFetch(() => json(200, { ...bad, timeline: { ...bad.timeline, items: [{ kind: "hologram" }] } }));
    const error = await failureOf(client(fetch).conversation("conv-1"));
    expect(error.failure.kind).toBe("invalid-response");
  });

  it("reports network failures and timeouts separately", async () => {
    const network = fakeFetch(networkError);
    expect((await failureOf(client(network.fetch).info())).failure.kind).toBe("network");
    const hanging: FetchLike = (_url, init) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    });
    expect((await failureOf(client(hanging).info())).failure).toEqual({ kind: "timeout", timeoutMs: 50 });
  });

  it("posts commands with their IDs and returns the receipt", async () => {
    const receipt = { commandId: "cmd-1", conversationId: "conv-1", cursor: 9, acceptedAt: "2026-11-16T10:00:00.000Z" };
    const { fetch, calls } = fakeFetch(() => json(200, { receipt }));
    const result = await client(fetch).sendMessage("conv 1", { commandId: "cmd-1", runId: "run-1", instruction: "Hello" });
    expect(result).toEqual(receipt);
    expect(calls[0]).toMatchObject({ method: "POST", url: "https://abc123.remote.withnora.run/v1/conversations/conv%201/messages",
      body: { commandId: "cmd-1", runId: "run-1", instruction: "Hello" } });
    expect(calls[0]?.headers["Content-Type"]).toBe("application/json");
  });

  it("builds query strings and the realtime URL", async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { schemaVersion: 1, after: 3, nextCursor: 3, events: [] }));
    const runtime = client(fetch);
    await runtime.events({ after: 3, limit: 200 });
    expect(calls[0]?.url).toBe("https://abc123.remote.withnora.run/v1/events?after=3&limit=200");
    expect(runtime.realtimeUrl("t".repeat(40))).toBe(`wss://abc123.remote.withnora.run/v1/realtime?ticket=${"t".repeat(40)}`);
  });

  it("refuses hostnames that are not bare hostnames", () => {
    expect(() => createRuntimeClient({ hostname: "evil.example/path", fetch: fakeFetch(() => json(200, {})).fetch, timeoutMs: 1,
      commandTimeoutMs: 1, getToken: async () => "t" })).toThrow();
  });
});

it("loads and validates project-specific model catalogs", async () => {
  const { fetch, calls } = fakeFetch(() => json(200, demoProviderOptions));
  expect(await client(fetch).providerOptions("project / one")).toEqual(demoProviderOptions);
  expect(new URL(calls[0]!.url).pathname).toBe("/v1/provider-options");
  expect(new URL(calls[0]!.url).searchParams.get("projectId")).toBe("project / one");
  const invalid = fakeFetch(() => json(200, { providers: [], defaultBinding: { model: "invalid" } }));
  expect((await failureOf(client(invalid.fetch).providerOptions("project"))).failure.kind).toBe("invalid-response");
});
