import type { SessionTokenVerifier } from "./auth.types";
import type { ProvisioningService } from "./provisioning.types";
import type { PushService } from "./push.types";
import type { RateLimiter } from "./rateLimit.types";

export interface DirectoryHandlerDeps {
  readonly allowedOrigins: readonly string[];
  readonly verifier: SessionTokenVerifier;
  readonly rateLimiter: RateLimiter;
  readonly service: ProvisioningService;
  readonly push: PushService;
}
