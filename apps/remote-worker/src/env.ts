import { REMOTE_LIMITS, REMOTE_WEB_APP_ORIGIN, RUNTIME_HOSTNAME_SUFFIX } from "@shared/remote-access/constants";
import { z } from "zod";
import type { WorkerConfig } from "./types/env.types";

/** Keeps the Clerk directory comfortably under the 8 KB private-metadata limit. */
const MAX_RUNTIMES_CEILING = 10;

const rateLimitBindingSchema = z.custom<RateLimit>(
  (value) => typeof value === "object" && value !== null && "limit" in value && typeof value.limit === "function",
  "Expected a Workers Rate Limiting binding"
);

/** A comma-separated list of exact origins (scheme://host[:port]); wildcards are rejected. */
const allowedOriginsSchema = z
  .string()
  .transform((raw) => raw.split(",").map((origin) => origin.trim()).filter((origin) => origin.length > 0))
  .pipe(z.array(z.string().refine(isExactOrigin, "Each allowed origin must be an exact origin")).min(1));

const hostnameSuffixSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, "Invalid hostname suffix");

const envSchema = z.object({
  CLERK_SECRET_KEY: z.string().regex(/^sk_(?:test|live)_\S+$/),
  CLERK_PUBLISHABLE_KEY: z.string().regex(/^pk_(?:test|live)_[A-Za-z0-9+/=_-]+$/),
  CLOUDFLARE_API_TOKEN: z.string().min(1),
  CLOUDFLARE_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/),
  CLOUDFLARE_ZONE_ID: z.string().regex(/^[a-f0-9]{32}$/),
  HOSTNAME_SECRET: z.string().min(32, "HOSTNAME_SECRET must be at least 32 characters"),
  // Optional so a missing push secret disables only `/v1/push/send`, not the runtime directory.
  EXPO_ACCESS_TOKEN: z.string().trim().min(1).optional(),
  RUNTIME_HOSTNAME_SUFFIX: hostnameSuffixSchema.default(RUNTIME_HOSTNAME_SUFFIX),
  MAX_RUNTIMES_PER_USER: z.coerce.number().int().min(1).max(MAX_RUNTIMES_CEILING).default(REMOTE_LIMITS.maxRuntimesPerUser),
  ALLOWED_ORIGINS: allowedOriginsSchema.default([REMOTE_WEB_APP_ORIGIN]),
  GENERAL_RATE_LIMITER: rateLimitBindingSchema,
  PROVISION_RATE_LIMITER: rateLimitBindingSchema,
  PUSH_RATE_LIMITER: rateLimitBindingSchema
});

function isExactOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.origin === value;
  } catch {
    return false;
  }
}

/** Returns null on any misconfiguration; callers answer with a generic 500 so nothing about the env leaks. */
export function parseWorkerConfig(env: unknown): WorkerConfig | null {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) return null;
  const value = parsed.data;
  return {
    clerkSecretKey: value.CLERK_SECRET_KEY,
    clerkPublishableKey: value.CLERK_PUBLISHABLE_KEY,
    cloudflareApiToken: value.CLOUDFLARE_API_TOKEN,
    cloudflareAccountId: value.CLOUDFLARE_ACCOUNT_ID,
    cloudflareZoneId: value.CLOUDFLARE_ZONE_ID,
    hostnameSecret: value.HOSTNAME_SECRET,
    expoAccessToken: value.EXPO_ACCESS_TOKEN ?? null,
    runtimeHostnameSuffix: value.RUNTIME_HOSTNAME_SUFFIX,
    maxRuntimesPerUser: value.MAX_RUNTIMES_PER_USER,
    allowedOrigins: value.ALLOWED_ORIGINS,
    generalRateLimiter: value.GENERAL_RATE_LIMITER,
    provisionRateLimiter: value.PROVISION_RATE_LIMITER,
    pushRateLimiter: value.PUSH_RATE_LIMITER
  };
}
