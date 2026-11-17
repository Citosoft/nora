import type { CorsDecision } from "./types/cors.types";

export const CORS_ALLOWED_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";
export const CORS_ALLOWED_HEADERS = "Authorization, Content-Type";
const PREFLIGHT_MAX_AGE_SECONDS = "600";

/** Requests without an Origin (desktop runtime, server-to-server) are not browser cross-origin calls and pass. */
export function decideCors(origin: string | null, allowedOrigins: readonly string[]): CorsDecision {
  if (origin === null) return { kind: "no-origin" };
  return allowedOrigins.includes(origin) ? { kind: "allowed", origin } : { kind: "denied" };
}

/** Returns a copy of the response carrying CORS headers for an allowed origin; otherwise returns it unchanged. */
export function withCors(response: Response, decision: CorsDecision): Response {
  if (decision.kind !== "allowed") return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", decision.origin);
  headers.append("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function preflightResponse(decision: CorsDecision): Response {
  if (decision.kind === "denied") return new Response(null, { status: 403 });
  const headers = new Headers({ Allow: CORS_ALLOWED_METHODS });
  if (decision.kind === "allowed") {
    headers.set("Access-Control-Allow-Origin", decision.origin);
    headers.set("Access-Control-Allow-Methods", CORS_ALLOWED_METHODS);
    headers.set("Access-Control-Allow-Headers", CORS_ALLOWED_HEADERS);
    headers.set("Access-Control-Max-Age", PREFLIGHT_MAX_AGE_SECONDS);
    headers.set("Vary", "Origin");
  }
  return new Response(null, { status: 204, headers });
}
