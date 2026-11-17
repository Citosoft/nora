import { describe, expect, it } from "vitest";
import { createDirectoryClient } from "@/api/directory/directoryClient";
import { RemoteRequestError } from "@/api/http/remoteRequestError";
import type { FetchLike } from "@/types/http.types";
import { fakeFetch, json } from "./fixtures/fakeFetch";

const runtime = { installationId: "inst_0123456789abcdef", name: "Studio Mac", environment: "desktop", hostname: "abc123.remote.withnora.run",
  tunnelId: "tunnel-1", registeredAt: "2026-11-01T09:00:00.000Z" };

const directory = (fetch: FetchLike) => createDirectoryClient({ baseUrl: "https://remote-api.example.test/", fetch, timeoutMs: 100,
  getToken: async () => "clerk-token" });

describe("directoryClient", () => {
  it("lists runtimes with a bearer token", async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { runtimes: [runtime] }));
    expect(await directory(fetch).list()).toEqual([runtime]);
    expect(calls[0]).toMatchObject({ method: "GET", url: "https://remote-api.example.test/v1/runtimes" });
    expect(calls[0]?.headers.Authorization).toBe("Bearer clerk-token");
  });

  it("renames with a trimmed name and removes by installation ID", async () => {
    const { fetch, calls } = fakeFetch(
      () => json(200, { runtime: { ...runtime, name: "Office PC" } }),
      () => json(200, { deleted: true, installationId: runtime.installationId })
    );
    const client = directory(fetch);
    expect((await client.rename(runtime.installationId, "  Office PC ")).name).toBe("Office PC");
    await client.remove(runtime.installationId);
    expect(calls.map((call) => [call.method, call.url, call.body])).toEqual([
      ["PATCH", `https://remote-api.example.test/v1/runtimes/${runtime.installationId}`, { name: "Office PC" }],
      ["DELETE", `https://remote-api.example.test/v1/runtimes/${runtime.installationId}`, undefined]
    ]);
  });

  it("maps the Worker's error envelope", async () => {
    const { fetch } = fakeFetch(() => json(429, { error: { code: "rate-limited", message: "Slow down" } }));
    const error = await directory(fetch).list().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RemoteRequestError);
    if (!(error instanceof RemoteRequestError)) return;
    expect(error.code).toBe("rate-limited");
    expect(error.service).toBe("directory");
  });

  it("rejects malformed directory entries", async () => {
    const { fetch } = fakeFetch(() => json(200, { runtimes: [{ ...runtime, hostname: "Not A Host!" }] }));
    const error = await directory(fetch).list().catch((caught: unknown) => caught);
    expect(error instanceof RemoteRequestError && error.failure.kind).toBe("invalid-response");
  });
});
