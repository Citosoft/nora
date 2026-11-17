import { describe, expect, it } from "vitest";
import { probeRuntime } from "@/reachability/probeRuntime";
import type { FetchLike } from "@/types/http.types";
import { fakeFetch, json, networkError } from "./fixtures/fakeFetch";

const now = () => new Date("2026-11-16T10:00:00.000Z");
const probe = (fetch: FetchLike, timeoutMs = 100) => probeRuntime({ hostname: "abc123.remote.withnora.run", fetch, getToken: async () => "session-token", timeoutMs, now });

const runtimeInfo = { apiVersion: 1, runtimeVersion: "0.2.2", name: "Desktop", environment: "desktop", environmentId: "local", capabilities: [], cursor: 0 };

describe("probeRuntime", () => {
  it("is online only when the runtime itself answers, using a fresh authenticated session", async () => {
    const { fetch, calls } = fakeFetch(() => json(200, runtimeInfo));
    expect(await probe(fetch)).toEqual({ status: "online", apiVersion: 1, compatible: true, checkedAt: "2026-11-16T10:00:00.000Z" });
    expect(calls[0]?.url).toBe("https://abc123.remote.withnora.run/v1/runtime/info");
    expect(calls[0]?.headers.Authorization).toBe("Bearer session-token");
  });

  it("shows revoked or paused access as unavailable", async () => {
    for (const status of [401, 403]) {
      expect(await probe(fakeFetch(() => json(status, { error: { code: status === 401 ? "unauthenticated" : "forbidden", message: "Sign in" } })).fetch))
        .toMatchObject({ status: "offline", reason: "unavailable" });
    }
  });

  it("flags an incompatible API version", async () => {
    const { fetch } = fakeFetch(() => json(200, { ...runtimeInfo, apiVersion: 2 }));
    expect(await probe(fetch)).toMatchObject({ status: "online", compatible: false });
  });

  it("is offline when the tunnel answers for a computer that is off", async () => {
    const { fetch } = fakeFetch(() => new Response("<html>Cloudflare tunnel error 1033</html>", { status: 530 }));
    expect(await probe(fetch)).toMatchObject({ status: "offline", reason: "unreachable" });
  });

  it("is offline on network errors, timeouts and unexpected replies", async () => {
    expect(await probe(fakeFetch(networkError).fetch)).toMatchObject({ status: "offline", reason: "unreachable" });
    const hanging: FetchLike = (_url, init) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    });
    expect(await probe(hanging, 10)).toMatchObject({ status: "offline", reason: "timeout" });
    expect(await probe(fakeFetch(() => new Response("<html>ok</html>", { status: 200 })).fetch)).toMatchObject({ status: "offline", reason: "unexpected-reply" });
    expect(await probe(fakeFetch(() => json(503, { error: { code: "unavailable", message: "Disabled" } })).fetch))
      .toMatchObject({ status: "offline", reason: "unavailable" });
  });
});
