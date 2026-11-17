import { describe, expect, it } from "vitest";
import { parseWorkerConfig } from "../src/env";

const limiter: RateLimit = { limit: async () => ({ success: true }) };

const validEnv = {
  CLERK_SECRET_KEY: "sk_test_abc123",
  CLERK_PUBLISHABLE_KEY: `pk_test_${btoa("example.clerk.accounts.dev$")}`,
  CLOUDFLARE_API_TOKEN: "cf-token",
  CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  CLOUDFLARE_ZONE_ID: "fedcba9876543210fedcba9876543210",
  HOSTNAME_SECRET: "x".repeat(32),
  GENERAL_RATE_LIMITER: limiter,
  PROVISION_RATE_LIMITER: limiter
};

describe("parseWorkerConfig", () => {
  it("applies defaults from the shared constants", () => {
    const config = parseWorkerConfig(validEnv);
    expect(config?.runtimeHostnameSuffix).toBe("remote.withnora.run");
    expect(config?.maxRuntimesPerUser).toBe(3);
    expect(config?.allowedOrigins).toEqual(["https://app.withnora.run"]);
  });

  it("parses vars", () => {
    const config = parseWorkerConfig({
      ...validEnv,
      MAX_RUNTIMES_PER_USER: "5",
      ALLOWED_ORIGINS: "https://app.withnora.run, http://localhost:8081",
      RUNTIME_HOSTNAME_SUFFIX: "Runtimes.Withnora.Run"
    });
    expect(config?.maxRuntimesPerUser).toBe(5);
    expect(config?.allowedOrigins).toEqual(["https://app.withnora.run", "http://localhost:8081"]);
    expect(config?.runtimeHostnameSuffix).toBe("runtimes.withnora.run");
  });

  it.each([
    ["missing secret", { CLERK_SECRET_KEY: undefined }],
    ["placeholder account", { CLOUDFLARE_ACCOUNT_ID: "REPLACE_WITH_ACCOUNT_ID" }],
    ["short hostname secret", { HOSTNAME_SECRET: "short" }],
    ["wildcard origin", { ALLOWED_ORIGINS: "*" }],
    ["origin with path", { ALLOWED_ORIGINS: "https://app.withnora.run/" }],
    ["quota too high", { MAX_RUNTIMES_PER_USER: "50" }],
    ["quota not a number", { MAX_RUNTIMES_PER_USER: "many" }],
    ["missing limiter binding", { PROVISION_RATE_LIMITER: undefined }]
  ])("rejects %s", (_label, override) => {
    expect(parseWorkerConfig({ ...validEnv, ...override })).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(parseWorkerConfig(undefined)).toBeNull();
  });
});
