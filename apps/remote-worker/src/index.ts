import { createDirectoryInventory } from "./clerk/inventory";
import { cleanupTunnels } from "./maintenance/cleanup";
import { createClerkVerifier } from "./auth";
import { createClerkMetadataApi, createDirectoryStore } from "./clerk/directoryStore";
import { createPushDeviceStore } from "./clerk/pushDeviceStore";
import { createCloudflareClient } from "./cloudflare/client";
import { parseWorkerConfig } from "./env";
import { createDirectoryHandler } from "./handler";
import { errorResponse } from "./http/responses";
import { createExpoPushClient } from "./expo/pushClient";
import { createProvisioningService } from "./provisioning/service";
import { createPushService } from "./push/service";
import { createBindingRateLimiter } from "./rateLimit";
import { PUSH_LIMITS } from "@shared/remote-access/push";
import type { WorkerBindings } from "./types/env.types";

/** Composition root: validates bindings on every request and wires real adaptors into the handler. */
export default {
  async fetch(request: Request, env: WorkerBindings): Promise<Response> {
    try {
      return await handle(request, env);
    } catch {
      // Last-resort guard (e.g. an undecodable publishable key or a failing rate-limit binding): fail closed, generically.
      return errorResponse("internal", "Unexpected server error.");
    }
  },
  async scheduled(_event: ScheduledController, env: WorkerBindings): Promise<void> {
    const config = parseWorkerConfig(env);
    if (config === null) throw new Error("Relay cleanup misconfigured");
    const result = await cleanupTunnels({
      inventory: createDirectoryInventory(config.clerkSecretKey),
      store: createDirectoryStore(createClerkMetadataApi(config.clerkSecretKey)),
      tunnels: createCloudflareClient({ apiToken: config.cloudflareApiToken, accountId: config.cloudflareAccountId,
        zoneId: config.cloudflareZoneId, fetch: (input, init) => fetch(input, init) }),
      hostnameSuffix: config.runtimeHostnameSuffix,
      now: Date.now
    });
    console.log("Relay tunnel cleanup", result);
    if (result.failed > 0) throw new Error(`Relay cleanup failed for ${result.failed} tunnels; retry next run`);
  }
} satisfies ExportedHandler<WorkerBindings>;

async function handle(request: Request, env: WorkerBindings): Promise<Response> {
  const config = parseWorkerConfig(env);
  if (config === null) return errorResponse("internal", "Service misconfigured.");

  const clerk = createClerkMetadataApi(config.clerkSecretKey);
  const directory = createDirectoryStore(clerk);
  const service = createProvisioningService({
    store: directory,
    tunnels: createCloudflareClient({
      apiToken: config.cloudflareApiToken,
      accountId: config.cloudflareAccountId,
      zoneId: config.cloudflareZoneId,
      // Wrapped so `fetch` is never invoked detached from the global (Workers throws "Illegal invocation").
      fetch: (input, init) => fetch(input, init)
    }),
    clock: { now: () => new Date() },
    random: { bytes: (length) => crypto.getRandomValues(new Uint8Array(length)) },
    hostnameSecret: config.hostnameSecret,
    hostnameSuffix: config.runtimeHostnameSuffix,
    maxRuntimesPerUser: config.maxRuntimesPerUser
  });
  const push = createPushService({
    devices: createPushDeviceStore(clerk),
    directory,
    expo: config.expoAccessToken === null ? null
      : createExpoPushClient({ accessToken: config.expoAccessToken, fetch: (input, init) => fetch(input, init) }),
    clock: { now: () => new Date() },
    maxDevicesPerUser: PUSH_LIMITS.maxDevicesPerUser
  });

  const handler = createDirectoryHandler({
    allowedOrigins: config.allowedOrigins,
    verifier: createClerkVerifier({
      secretKey: config.clerkSecretKey,
      publishableKey: config.clerkPublishableKey,
      authorizedParties: config.allowedOrigins
    }),
    rateLimiter: createBindingRateLimiter({
      general: config.generalRateLimiter,
      provisioning: config.provisionRateLimiter,
      push: config.pushRateLimiter
    }),
    service,
    push
  });
  return handler(request);
}
