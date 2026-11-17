export type RateLimitScope = "general" | "provisioning";

/** Returns true when the key may proceed. Implementations decide how to count. */
export interface RateLimiter {
  allow(scope: RateLimitScope, key: string): Promise<boolean>;
}
