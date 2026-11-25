import type { RateLimiter, RateLimitScope } from "./types/rateLimit.types";

/** Adapts the Workers Rate Limiting bindings to the injectable `RateLimiter` interface. */
export function createBindingRateLimiter(bindings: Readonly<Record<RateLimitScope, RateLimit>>): RateLimiter {
  return {
    async allow(scope, key) {
      const outcome = await bindings[scope].limit({ key });
      return outcome.success;
    }
  };
}
