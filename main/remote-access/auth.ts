import { createRemoteJWKSet, customFetch, jwtVerify } from "jose";
import { z } from "zod";
import type { RemoteAuthOptions, RemoteTokenVerifier } from "@main/types/remote-access/auth.types";

const claimsSchema = z.object({ sub: z.string().min(1).max(128), sid: z.string().min(1).max(128),
  exp: z.number().int(), iat: z.number().int(), azp: z.string().optional() });
const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

export function bearerToken(header: string | null): string | null {
  return header && header.length <= 8199 ? BEARER.exec(header)?.[1] ?? null : null;
}

/** Public-key verification needs no Clerk secret key on the user's computer. Tokens stay short-lived. */
export function createRemoteTokenVerifier(options: RemoteAuthOptions): RemoteTokenVerifier {
  const issuer = new URL(options.issuer);
  if (issuer.protocol !== "https:" || issuer.origin !== options.issuer) throw new Error("Invalid account issuer.");
  const keys = createRemoteJWKSet(new URL("/.well-known/jwks.json", issuer), {
    timeoutDuration: 10_000, cooldownDuration: 30_000, cacheMaxAge: 60 * 60_000,
    ...(options.fetch ? { [customFetch]: options.fetch } : {})
  });
  return { async verify(token) {
    const now = options.now?.() ?? Date.now();
    const result = await jwtVerify(token, keys, { issuer: options.issuer, algorithms: ["RS256"],
      requiredClaims: ["sub", "sid", "exp", "iat"], maxTokenAge: "2m", currentDate: new Date(now), clockTolerance: 5 });
    const claims = claimsSchema.parse(result.payload);
    if (claims.exp * 1000 <= now || claims.exp - claims.iat > 120 || (claims.azp !== undefined && !options.origins.includes(claims.azp))) {
      throw new Error("Invalid session token.");
    }
    return { userId: claims.sub, sessionId: claims.sid, expiresAt: claims.exp * 1000 };
  } };
}
