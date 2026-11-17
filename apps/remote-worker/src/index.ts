import { createClerkVerifier } from "./auth";
import { createClerkMetadataApi, createDirectoryStore } from "./clerk/directoryStore";
import { createCloudflareClient } from "./cloudflare/client";
import { parseWorkerConfig } from "./env";
import { createDirectoryHandler } from "./handler";
import { errorResponse } from "./http/responses";
import { createProvisioningService } from "./provisioning/service";
import { createBindingRateLimiter } from "./rateLimit";
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
  }
} satisfies ExportedHandler<WorkerBindings>;

async function handle(request: Request, env: WorkerBindings): Promise<Response> {
  const config = parseWorkerConfig(env);
  if (config === null) return errorResponse("internal", "Service misconfigured.");

  const service = createProvisioningService({
    store: createDirectoryStore(createClerkMetadataApi(config.clerkSecretKey)),
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

  const handler = createDirectoryHandler({
    allowedOrigins: config.allowedOrigins,
    verifier: createClerkVerifier({
      secretKey: config.clerkSecretKey,
      publishableKey: config.clerkPublishableKey,
      authorizedParties: config.allowedOrigins
    }),
    rateLimiter: createBindingRateLimiter({
      general: config.generalRateLimiter,
      provisioning: config.provisionRateLimiter
    }),
    service
  });
  return handler(request);
}
