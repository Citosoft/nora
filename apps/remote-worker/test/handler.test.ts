import { directoryErrorSchema, provisionRuntimeResponseSchema } from "@shared/remote-access/directory";
import { describe, expect, it } from "vitest";
import { apiRequest, createHarness, INSTALL_1, provisionBody, TOKENS, WEB_ORIGIN } from "./fakes/harness";

async function errorCode(response: Response): Promise<string> {
  return directoryErrorSchema.parse(await response.json()).error.code;
}

describe("authentication fails closed", () => {
  it.each([
    ["missing header", null],
    ["malformed token", "not-a-jwt"],
    ["verifier throws", TOKENS.throws]
  ])("returns 401 for %s", async (_label, token) => {
    const h = createHarness();
    const response = await h.handle(apiRequest("GET", "/v1/runtimes", { token }));
    expect(response.status).toBe(401);
    expect(await errorCode(response)).toBe("unauthenticated");
    expect(h.clerk.merges).toBe(0);
  });

  it("rejects a non-Bearer scheme", async () => {
    const h = createHarness();
    const request = new Request("https://remote-api.withnora.run/v1/runtimes", { headers: { Authorization: `Basic ${TOKENS.userA}` } });
    expect((await h.handle(request)).status).toBe(401);
  });

  it("does not create resources for an unauthenticated provision", async () => {
    const h = createHarness();
    const response = await h.handle(apiRequest("POST", "/v1/runtimes/provision", { token: null, body: provisionBody(INSTALL_1) }));
    expect(response.status).toBe(401);
    expect(h.tunnels.calls).toEqual([]);
  });
});

describe("routing", () => {
  it.each(["/", "/v1", "/v1/runtimes/", "/v1/runtimes/abc/rotate/extra", "/v1/runtimes/abc/unknown", "/v2/runtimes"])(
    "returns 404 for %s",
    async (path) => {
      const response = await createHarness().handle(apiRequest("GET", path));
      expect(response.status).toBe(404);
      expect(await errorCode(response)).toBe("not-found");
    }
  );

  it("returns 405 with Allow for a known path and wrong method", async () => {
    const response = await createHarness().handle(apiRequest("DELETE", "/v1/runtimes"));
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });
});

describe("request validation", () => {
  it.each([
    ["non-JSON body", { rawBody: "{nope" }],
    ["missing fields", { body: { installationId: INSTALL_1 } }],
    ["port out of range", { body: provisionBody(INSTALL_1, 80) }],
    ["short installation ID", { body: provisionBody("short") }],
    ["unknown field", { body: { ...provisionBody(INSTALL_1), owner: "user_x" } }],
    ["oversized body", { body: { ...provisionBody(INSTALL_1), name: "x".repeat(5000) } }]
  ])("returns 400 for %s", async (_label, options) => {
    const h = createHarness();
    const response = await h.handle(apiRequest("POST", "/v1/runtimes/provision", options));
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("invalid");
    expect(h.tunnels.calls).toEqual([]);
  });

  it("returns 400 for an invalid installation ID in the path", async () => {
    const response = await createHarness().handle(apiRequest("DELETE", "/v1/runtimes/bad%20id"));
    expect(response.status).toBe(400);
  });

  it("returns 400 for an empty rename", async () => {
    const h = createHarness();
    await h.handle(apiRequest("POST", "/v1/runtimes/provision", { body: provisionBody(INSTALL_1) }));
    const response = await h.handle(apiRequest("PATCH", `/v1/runtimes/${INSTALL_1}`, { body: { name: "   " } }));
    expect(response.status).toBe(400);
  });
});

describe("rate limiting", () => {
  it("returns 429 when the provisioning limiter denies, keyed by the verified user", async () => {
    const h = createHarness();
    h.limiter.denied.add("provisioning");
    const response = await h.handle(apiRequest("POST", "/v1/runtimes/provision", { body: provisionBody(INSTALL_1) }));
    expect(response.status).toBe(429);
    expect(await errorCode(response)).toBe("rate-limited");
    expect(h.tunnels.calls).toEqual([]);
    expect(h.limiter.calls.every((call) => call.key === "user_aaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(true);
    // Listing only consults the general limiter.
    expect((await h.handle(apiRequest("GET", "/v1/runtimes"))).status).toBe(200);
  });

  it("returns 429 for any route when the general limiter denies", async () => {
    const h = createHarness();
    h.limiter.denied.add("general");
    expect((await h.handle(apiRequest("GET", "/v1/runtimes"))).status).toBe(429);
  });
});

describe("CORS", () => {
  it("echoes an allowed origin", async () => {
    const response = await createHarness().handle(apiRequest("GET", "/v1/runtimes", { origin: WEB_ORIGIN }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(WEB_ORIGIN);
    expect(response.headers.get("Vary")).toContain("Origin");
  });

  it("refuses a disallowed origin without CORS headers or side effects", async () => {
    const h = createHarness();
    const response = await h.handle(
      apiRequest("POST", "/v1/runtimes/provision", { origin: "https://evil.example", body: provisionBody(INSTALL_1) })
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(h.tunnels.calls).toEqual([]);
  });

  it("allows requests without an Origin (desktop) and adds no CORS headers", async () => {
    const response = await createHarness().handle(apiRequest("GET", "/v1/runtimes"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("answers an allowed preflight", async () => {
    const response = await createHarness().handle(apiRequest("OPTIONS", "/v1/runtimes/provision", { token: null, origin: WEB_ORIGIN }));
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(WEB_ORIGIN);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("PATCH");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Authorization, Content-Type");
  });

  it("rejects a disallowed preflight with 403 and no CORS headers", async () => {
    const response = await createHarness().handle(
      apiRequest("OPTIONS", "/v1/runtimes/provision", { token: null, origin: "https://app.withnora.run.evil.example" })
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("end-to-end over HTTP", () => {
  it("provisions, lists, renames, rotates and deletes", async () => {
    const h = createHarness();
    const provisioned = await h.handle(apiRequest("POST", "/v1/runtimes/provision", { body: provisionBody(INSTALL_1) }));
    expect(provisioned.status).toBe(200);
    const { runtime } = provisionRuntimeResponseSchema.parse(await provisioned.json());

    const listed = await (await h.handle(apiRequest("GET", "/v1/runtimes"))).json();
    expect(listed).toEqual({ runtimes: [runtime] });

    const renamed = await h.handle(apiRequest("PATCH", `/v1/runtimes/${INSTALL_1}`, { body: { name: "Laptop" } }));
    expect(await renamed.json()).toEqual({ runtime: { ...runtime, name: "Laptop" } });

    expect((await h.handle(apiRequest("POST", `/v1/runtimes/${INSTALL_1}/rotate`))).status).toBe(200);

    const deleted = await h.handle(apiRequest("DELETE", `/v1/runtimes/${INSTALL_1}`));
    expect(await deleted.json()).toEqual({ deleted: true, installationId: INSTALL_1 });
    expect(await (await h.handle(apiRequest("GET", "/v1/runtimes"))).json()).toEqual({ runtimes: [] });
  });

  it("returns 404 when another account targets a runtime by ID", async () => {
    const h = createHarness();
    await h.handle(apiRequest("POST", "/v1/runtimes/provision", { body: provisionBody(INSTALL_1) }));
    for (const request of [
      apiRequest("DELETE", `/v1/runtimes/${INSTALL_1}`, { token: TOKENS.userB }),
      apiRequest("POST", `/v1/runtimes/${INSTALL_1}/rotate`, { token: TOKENS.userB }),
      apiRequest("PATCH", `/v1/runtimes/${INSTALL_1}`, { token: TOKENS.userB, body: { name: "Mine" } })
    ]) {
      const response = await h.handle(request);
      expect(response.status).toBe(404);
    }
    expect(await (await h.handle(apiRequest("GET", "/v1/runtimes"))).json()).toMatchObject({ runtimes: [{ name: "Studio Mac" }] });
    expect(h.tunnels.liveTunnels()).toHaveLength(1);
  });

  it("maps quota to 409 and upstream failures to 502 without leaking details", async () => {
    const h = createHarness({ maxRuntimesPerUser: 1 });
    await h.handle(apiRequest("POST", "/v1/runtimes/provision", { body: provisionBody(INSTALL_1) }));
    const quota = await h.handle(apiRequest("POST", "/v1/runtimes/provision", { body: provisionBody("install-9999999999999999") }));
    expect(quota.status).toBe(409);
    expect(await errorCode(quota)).toBe("quota");

    h.tunnels.failing.add("getTunnelToken");
    const upstream = await h.handle(apiRequest("POST", "/v1/runtimes/provision", { body: provisionBody(INSTALL_1) }));
    expect(upstream.status).toBe(502);
    const body = directoryErrorSchema.parse(await upstream.json());
    expect(body.error.message).not.toContain("getTunnelToken");
  });
});
