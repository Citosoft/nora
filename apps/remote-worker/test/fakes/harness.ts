import { PUSH_LIMITS } from "@shared/remote-access/push";
import { createDirectoryStore } from "../../src/clerk/directoryStore";
import { createPushDeviceStore } from "../../src/clerk/pushDeviceStore";
import { createDirectoryHandler } from "../../src/handler";
import { createProvisioningService } from "../../src/provisioning/service";
import { createPushService } from "../../src/push/service";
import type { SessionTokenVerifier } from "../../src/types/auth.types";
import type { RateLimiter, RateLimitScope } from "../../src/types/rateLimit.types";
import { FakeClerkMetadata } from "./fakeClerkMetadata";
import { FakeExpoPushClient } from "./fakeExpoPushClient";
import { FakeTunnelProvider } from "./fakeTunnelProvider";
import type { Harness } from "../types/harness.types";

export const HOSTNAME_SECRET = "test-hostname-secret-0123456789abcdef";
export const SUFFIX = "remote.withnora.run";
export const WEB_ORIGIN = "https://app.withnora.run";
export const USER_A = "user_aaaaaaaaaaaaaaaaaaaaaaaaaaa";
export const USER_B = "user_bbbbbbbbbbbbbbbbbbbbbbbbbbb";
export const INSTALL_1 = "install-1111111111111111";
export const INSTALL_2 = "install-2222222222222222";
export const INSTALL_3 = "install-3333333333333333";
export const INSTALL_4 = "install-4444444444444444";

/** Header-shaped JWTs; the fake verifier maps them to users. */
export const TOKENS = Object.freeze({
  userA: "aaa.bbb.ccc",
  userB: "ddd.eee.fff",
  throws: "ggg.hhh.iii"
});

export class FakeRateLimiter implements RateLimiter {
  readonly denied = new Set<RateLimitScope>();
  readonly calls: Array<{ scope: RateLimitScope; key: string }> = [];

  async allow(scope: RateLimitScope, key: string): Promise<boolean> {
    this.calls.push({ scope, key });
    return !this.denied.has(scope);
  }
}

export function createFakeVerifier(): SessionTokenVerifier {
  const users = new Map<string, string>([
    [TOKENS.userA, USER_A],
    [TOKENS.userB, USER_B]
  ]);
  return {
    async verify(token) {
      const userId = users.get(token);
      if (userId === undefined) throw new Error("invalid token");
      return { userId, authorizedParty: null };
    }
  };
}

export function createHarness(options: { readonly maxRuntimesPerUser?: number; readonly expoConfigured?: boolean } = {}): Harness {
  const clerk = new FakeClerkMetadata();
  const tunnels = new FakeTunnelProvider();
  const limiter = new FakeRateLimiter();
  let now = Date.parse("2026-11-16T10:00:00.000Z");
  let randomCounter = 0;
  const expo = new FakeExpoPushClient();
  const directory = createDirectoryStore(clerk);
  const service = createProvisioningService({
    store: directory,
    tunnels,
    clock: { now: () => new Date(now) },
    random: { bytes: (length) => new Uint8Array(length).fill(++randomCounter % 256) },
    hostnameSecret: HOSTNAME_SECRET,
    hostnameSuffix: SUFFIX,
    maxRuntimesPerUser: options.maxRuntimesPerUser ?? 3
  });
  const push = createPushService({
    devices: createPushDeviceStore(clerk),
    directory,
    expo: options.expoConfigured === false ? null : expo,
    clock: { now: () => new Date(now) },
    maxDevicesPerUser: PUSH_LIMITS.maxDevicesPerUser
  });
  const handle = createDirectoryHandler({
    allowedOrigins: [WEB_ORIGIN],
    verifier: createFakeVerifier(),
    rateLimiter: limiter,
    service,
    push
  });
  return { clerk, tunnels, limiter, expo, service, handle, tick: () => { now += 1000; } };
}

export function apiRequest(
  method: string,
  path: string,
  options: { readonly token?: string | null; readonly body?: unknown; readonly origin?: string; readonly rawBody?: string } = {}
): Request {
  const headers = new Headers();
  const token = options.token === undefined ? TOKENS.userA : options.token;
  if (token !== null) headers.set("Authorization", `Bearer ${token}`);
  if (options.origin !== undefined) headers.set("Origin", options.origin);
  const init: RequestInit = { method, headers };
  if (options.rawBody !== undefined) init.body = options.rawBody;
  else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(options.body);
  }
  return new Request(`https://remote-api.withnora.run${path}`, init);
}

export function provisionBody(installationId: string, port = 47821, name = "Studio Mac"): Record<string, unknown> {
  return { installationId, name, environment: "desktop", port };
}
