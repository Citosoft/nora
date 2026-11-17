import { verifyToken } from "@clerk/backend";
import { z } from "zod";
import type { ClerkVerifierOptions, SessionTokenVerifier, VerifiedSessionClaims } from "./types/auth.types";

/** Compact JWS: three base64url segments. Anything else is rejected before touching the verifier. */
const BEARER_PATTERN = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;
const MAX_TOKEN_LENGTH = 8192;

const verifiedPayloadSchema = z.object({
  /** Clerk user IDs are URL-safe; anything else is refused so the ID is safe in tunnel names and HMAC input. */
  sub: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  azp: z.string().min(1).optional()
});

export function extractBearerToken(header: string | null): string | null {
  if (header === null || header.length > MAX_TOKEN_LENGTH + 7) return null;
  return BEARER_PATTERN.exec(header)?.[1] ?? null;
}

/**
 * Resolves the Clerk user ID from a request, or null. Every failure (missing header, malformed token, verifier
 * error) collapses to null so the caller answers a uniform 401 without revealing why.
 */
export async function authenticate(request: Request, verifier: SessionTokenVerifier): Promise<string | null> {
  const token = extractBearerToken(request.headers.get("Authorization"));
  if (token === null) return null;
  try {
    const claims = await verifier.verify(token);
    return claims.userId.length > 0 ? claims.userId : null;
  } catch {
    return null;
  }
}

/**
 * The session token's `iss` is the instance's Frontend API URL, which the publishable key encodes as
 * base64("<frontend-api-host>$").
 */
export function issuerFromPublishableKey(publishableKey: string): string {
  const match = /^pk_(?:test|live)_(.+)$/.exec(publishableKey);
  if (match?.[1] === undefined) throw new Error("Invalid Clerk publishable key");
  const decoded = atob(match[1].replace(/-/g, "+").replace(/_/g, "/"));
  if (!decoded.endsWith("$")) throw new Error("Invalid Clerk publishable key");
  const host = decoded.slice(0, -1);
  if (!/^[a-z0-9.-]+$/i.test(host)) throw new Error("Invalid Clerk publishable key");
  return `https://${host}`;
}

/**
 * Clerk `verifyToken` checks signature (JWKS fetched with the secret key), `exp`/`nbf`/`iat` and, when given,
 * `iss`. Its own `authorizedParties` option REJECTS tokens that have no `azp` claim (@clerk/backend 3.x,
 * `assertAuthorizedPartiesClaim`), which would break desktop tokens minted without one, so `azp` is checked here
 * instead: enforced against the allowlist only when present.
 */
export function createClerkVerifier(options: ClerkVerifierOptions): SessionTokenVerifier {
  const issuer = issuerFromPublishableKey(options.publishableKey);
  return {
    async verify(token): Promise<VerifiedSessionClaims> {
      const payload: unknown = await verifyToken(token, { secretKey: options.secretKey, issuer });
      const claims = verifiedPayloadSchema.parse(payload);
      if (claims.azp !== undefined && !options.authorizedParties.includes(claims.azp)) {
        throw new Error("Unauthorized party");
      }
      return { userId: claims.sub, authorizedParty: claims.azp ?? null };
    }
  };
}
