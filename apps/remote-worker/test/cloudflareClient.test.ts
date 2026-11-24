import { describe, expect, it } from "vitest";
import { createCloudflareClient } from "../src/cloudflare/client";
import { UpstreamError } from "../src/errors/upstreamError";
import type { CannedFetchResponse, RecordedFetchCall } from "./types/fakes.types";

const ACCOUNT = "0123456789abcdef0123456789abcdef";
const ZONE = "fedcba9876543210fedcba9876543210";
const TUNNEL_ID = "f70ff985-a4ef-4643-bbbc-4a0ed4fc8415";

function ok(result: unknown): CannedFetchResponse {
  return { status: 200, body: { success: true, errors: [], messages: [], result } };
}

function fail(status: number, code: number): CannedFetchResponse {
  return { status, body: { success: false, errors: [{ code, message: "nope" }], messages: [], result: null } };
}

/** Serves canned responses in order and records every request. */
function fakeFetch(responses: CannedFetchResponse[]) {
  const calls: RecordedFetchCall[] = [];
  const fetch = async (input: string, init: RequestInit): Promise<Response> => {
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    const authorization = new Headers(init.headers).get("Authorization");
    calls.push({ method: init.method ?? "GET", url: new URL(input), body, authorization });
    const next = responses.shift();
    if (next === undefined) throw new Error("unexpected request");
    return new Response(JSON.stringify(next.body), { status: next.status, headers: { "Content-Type": "application/json" } });
  };
  return { calls, client: createCloudflareClient({ apiToken: "cf-token", accountId: ACCOUNT, zoneId: ZONE, fetch }) };
}

const tunnel = (overrides: Record<string, unknown> = {}) => ({ id: TUNNEL_ID, name: "nora-u-i", deleted_at: null, ...overrides });

describe("cloudflare client", () => {
  it("creates a remotely managed tunnel", async () => {
    const { calls, client } = fakeFetch([ok(tunnel())]);
    expect(await client.createTunnel("nora-u-i", "c2VjcmV0")).toEqual({ id: TUNNEL_ID, name: "nora-u-i" });
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url.pathname).toBe(`/client/v4/accounts/${ACCOUNT}/cfd_tunnel`);
    expect(calls[0]?.body).toEqual({ name: "nora-u-i", config_src: "cloudflare", tunnel_secret: "c2VjcmV0" });
    expect(calls[0]?.authorization).toBe("Bearer cf-token");
  });

  it("finds tunnels by exact name excluding deleted ones", async () => {
    const { calls, client } = fakeFetch([ok([tunnel({ name: "nora-u-i-other" }), tunnel()])]);
    expect(await client.findTunnelByName("nora-u-i")).toEqual({ id: TUNNEL_ID, name: "nora-u-i" });
    expect(calls[0]?.url.searchParams.get("name")).toBe("nora-u-i");
    expect(calls[0]?.url.searchParams.get("is_deleted")).toBe("false");
  });

  it("treats a 404 or soft-deleted tunnel as missing", async () => {
    const { client } = fakeFetch([fail(404, 1003), ok(tunnel({ deleted_at: "2026-11-01T00:00:00Z" }))]);
    expect(await client.getTunnel(TUNNEL_ID)).toBeNull();
    expect(await client.getTunnel(TUNNEL_ID)).toBeNull();
  });

  it("reads the connector token as a string result", async () => {
    const { calls, client } = fakeFetch([ok("eyJhIjoiYiJ9")]);
    expect(await client.getTunnelToken(TUNNEL_ID)).toBe("eyJhIjoiYiJ9");
    expect(calls[0]?.url.pathname).toBe(`/client/v4/accounts/${ACCOUNT}/cfd_tunnel/${TUNNEL_ID}/token`);
  });

  it("puts loopback ingress with a 404 catch-all", async () => {
    const { calls, client } = fakeFetch([ok({ tunnel_id: TUNNEL_ID, version: 1 })]);
    await client.putIngress(TUNNEL_ID, { hostname: "abc.remote.withnora.run", port: 47821 });
    expect(calls[0]?.method).toBe("PUT");
    expect(calls[0]?.url.pathname).toBe(`/client/v4/accounts/${ACCOUNT}/cfd_tunnel/${TUNNEL_ID}/configurations`);
    expect(calls[0]?.body).toEqual({
      config: { ingress: [{ hostname: "abc.remote.withnora.run", service: "http://127.0.0.1:47821" }, { service: "http_status:404" }] }
    });
  });

  it("rotates the secret with PATCH", async () => {
    const { calls, client } = fakeFetch([ok(tunnel())]);
    await client.updateTunnelSecret(TUNNEL_ID, "bmV3");
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.body).toEqual({ tunnel_secret: "bmV3" });
  });

  it("tolerates deleting connections and tunnels that are already gone", async () => {
    const { calls, client } = fakeFetch([fail(404, 1003), fail(404, 1003)]);
    await client.deleteTunnelConnections(TUNNEL_ID);
    await client.deleteTunnel(TUNNEL_ID);
    expect(calls.map((call) => `${call.method} ${call.url.pathname}`)).toEqual([
      `DELETE /client/v4/accounts/${ACCOUNT}/cfd_tunnel/${TUNNEL_ID}/connections`,
      `DELETE /client/v4/accounts/${ACCOUNT}/cfd_tunnel/${TUNNEL_ID}`
    ]);
  });

  it("creates a proxied CNAME when none exists", async () => {
    const { calls, client } = fakeFetch([ok([]), ok({ id: "rec1", name: "abc.remote.withnora.run" })]);
    expect(await client.upsertCname("abc.remote.withnora.run", `${TUNNEL_ID}.cfargotunnel.com`)).toEqual({ recordId: "rec1", created: true });
    expect(calls[0]?.url.pathname).toBe(`/client/v4/zones/${ZONE}/dns_records`);
    expect(calls[0]?.url.searchParams.get("type")).toBe("CNAME");
    expect(calls[0]?.url.searchParams.get("name.exact")).toBe("abc.remote.withnora.run");
    expect(calls[1]?.body).toEqual({
      type: "CNAME",
      name: "abc.remote.withnora.run",
      content: `${TUNNEL_ID}.cfargotunnel.com`,
      proxied: true,
      ttl: 1
    });
  });

  it("overwrites a CNAME that points elsewhere and leaves a correct one alone", async () => {
    const stale = { id: "rec1", name: "abc.remote.withnora.run", content: "old.cfargotunnel.com" };
    const { calls, client } = fakeFetch([ok([stale]), ok(stale), ok([{ ...stale, content: `${TUNNEL_ID}.cfargotunnel.com` }])]);
    await client.upsertCname("abc.remote.withnora.run", `${TUNNEL_ID}.cfargotunnel.com`);
    expect(calls[1]?.method).toBe("PUT");
    expect(calls[1]?.url.pathname).toBe(`/client/v4/zones/${ZONE}/dns_records/rec1`);
    expect((await client.upsertCname("abc.remote.withnora.run", `${TUNNEL_ID}.cfargotunnel.com`)).created).toBe(false);
    expect(calls).toHaveLength(3);
  });

  it("deletes a CNAME by name and tolerates a missing one", async () => {
    const { calls, client } = fakeFetch([ok([{ id: "rec1", name: "abc.remote.withnora.run" }]), ok({ id: "rec1" }), ok([])]);
    await client.deleteCname("abc.remote.withnora.run");
    await client.deleteCname("abc.remote.withnora.run");
    expect(calls.map((call) => call.method)).toEqual(["GET", "DELETE", "GET"]);
  });

  it("raises UpstreamError for API errors, unparseable bodies and unexpected shapes", async () => {
    const { client } = fakeFetch([fail(400, 1013), { status: 502, body: "<html>" }, ok({ unexpected: true })]);
    await expect(client.createTunnel("n", "s")).rejects.toBeInstanceOf(UpstreamError);
    await expect(client.createTunnel("n", "s")).rejects.toBeInstanceOf(UpstreamError);
    await expect(client.getTunnelToken(TUNNEL_ID)).rejects.toBeInstanceOf(UpstreamError);
  });

  it("raises UpstreamError when success is false despite HTTP 200", async () => {
    const { client } = fakeFetch([{ status: 200, body: { success: false, errors: [{ code: 1000, message: "x" }], result: null } }]);
    await expect(client.getTunnelToken(TUNNEL_ID)).rejects.toBeInstanceOf(UpstreamError);
  });

  it("does not include the API token in error messages", async () => {
    const { client } = fakeFetch([fail(403, 10000)]);
    await expect(client.getTunnelToken(TUNNEL_ID)).rejects.toSatisfy((error: unknown) => error instanceof Error && !error.message.includes("cf-token"));
  });
});

describe("cleanup adaptor", () => {
  it("paginates the complete inventory including deleted tunnels before cleanup", async () => {
    const record = tunnel({ created_at: "2026-01-01T00:00:00Z", conns_inactive_at: "2026-01-02T00:00:00Z", status: "down" });
    const { calls, client } = fakeFetch([ok(Array.from({ length: 100 }, (_, index) => ({ ...record, id: String(index) }))),
      ok([]), ok([{ ...record, id: "deleted", deleted_at: "2026-10-01T00:00:00Z" }])]);
    const result = await client.listForCleanup();
    expect(result).toHaveLength(101);
    expect(result[100]?.deleted).toBe(true);
    expect(result[0]?.disconnectedAt).toBe("2026-01-02T00:00:00Z");
    expect(calls.map((call) => call.url.searchParams.get("page"))).toEqual(["1", "2", "1"]);
    expect(calls.map((call) => call.url.searchParams.get("is_deleted"))).toEqual(["false", "false", "true"]);
    expect(calls[0]?.url.searchParams.get("include_prefix")).toBe("nora-");
  });

  it("normalizes absent activity conservatively", async () => {
    const { client } = fakeFetch([ok(tunnel())]);
    expect(await client.inspect(TUNNEL_ID)).toMatchObject({ status: null, createdAt: null, disconnectedAt: null, deleted: false });
  });

  it("deletes only Nora runtime DNS still pointing to this tunnel", async () => {
    const name = `${"a".repeat(32)}.withnora.run`;
    const matching = { id: "dns", name, content: `${TUNNEL_ID}.cfargotunnel.com` };
    const { calls, client } = fakeFetch([ok([matching, { ...matching, id: "other", name: "app.withnora.run" },
      { ...matching, id: "zone", name: `${"a".repeat(32)}.other.run` }]), ok([matching]), ok({})]);
    await client.deleteTunnelDns(TUNNEL_ID, "withnora.run");
    expect(calls.filter((call) => call.method === "DELETE").map((call) => call.url.pathname)).toEqual([
      `/client/v4/zones/${ZONE}/dns_records/dns`
    ]);
    expect(calls[0]?.url.searchParams.get("content.exact")).toBe(`${TUNNEL_ID}.cfargotunnel.com`);
  });

  it("preserves DNS repointed to a replacement during cleanup", async () => {
    const matching = { id: "dns", name: `${"a".repeat(32)}.withnora.run`, content: `${TUNNEL_ID}.cfargotunnel.com` };
    const { calls, client } = fakeFetch([ok([matching]), ok([{ ...matching, content: "new.cfargotunnel.com" }])]);
    await client.deleteTunnelDns(TUNNEL_ID, "withnora.run");
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });
});
