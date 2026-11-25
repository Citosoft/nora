/** Raw bindings Cloudflare passes to the Worker. Values are validated by `parseWorkerConfig` before use. */
export interface WorkerBindings {
  readonly CLERK_SECRET_KEY?: string;
  readonly CLERK_PUBLISHABLE_KEY?: string;
  readonly CLOUDFLARE_API_TOKEN?: string;
  readonly CLOUDFLARE_ACCOUNT_ID?: string;
  readonly CLOUDFLARE_ZONE_ID?: string;
  readonly HOSTNAME_SECRET?: string;
  readonly EXPO_ACCESS_TOKEN?: string;
  readonly RUNTIME_HOSTNAME_SUFFIX?: string;
  readonly MAX_RUNTIMES_PER_USER?: string;
  readonly ALLOWED_ORIGINS?: string;
  readonly GENERAL_RATE_LIMITER?: RateLimit;
  readonly PROVISION_RATE_LIMITER?: RateLimit;
  readonly PUSH_RATE_LIMITER?: RateLimit;
}

export interface WorkerConfig {
  readonly clerkSecretKey: string;
  readonly clerkPublishableKey: string;
  readonly cloudflareApiToken: string;
  readonly cloudflareAccountId: string;
  readonly cloudflareZoneId: string;
  readonly hostnameSecret: string;
  /** Null when the secret is unset: phones can still register, but sending answers `internal`. */
  readonly expoAccessToken: string | null;
  readonly runtimeHostnameSuffix: string;
  readonly maxRuntimesPerUser: number;
  readonly allowedOrigins: readonly string[];
  readonly generalRateLimiter: RateLimit;
  readonly provisionRateLimiter: RateLimit;
  readonly pushRateLimiter: RateLimit;
}
