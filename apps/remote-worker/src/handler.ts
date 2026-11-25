import {
  deleteRuntimeResponseSchema,
  installationIdSchema,
  listRuntimesResponseSchema,
  provisionRuntimeRequestSchema,
  provisionRuntimeResponseSchema,
  renameRuntimeRequestSchema,
  rotateRuntimeResponseSchema,
  runtimeResponseSchema
} from "@shared/remote-access/directory";
import {
  deletePushDeviceResponseSchema,
  pushDeviceIdSchema,
  pushDeviceResponseSchema,
  registerPushDeviceRequestSchema,
  sendPushRequestSchema,
  sendPushResponseSchema
} from "@shared/remote-access/push";
import type { z } from "zod";
import { authenticate } from "./auth";
import { decideCors, preflightResponse, withCors } from "./cors";
import { DirectoryFailure } from "./errors/directoryFailure";
import { UpstreamError } from "./errors/upstreamError";
import { contractResponse, errorResponse } from "./http/responses";
import { matchRoute } from "./router";
import type { DirectoryHandlerDeps } from "./types/handler.types";
import type { RateLimitScope } from "./types/rateLimit.types";
import type { DirectoryRoute } from "./types/router.types";

/** Request bodies here are tiny; anything larger is refused before parsing. */
const MAX_BODY_BYTES = 4 * 1024;
/** A push batch carries up to 10 notifications with titles, bodies and IDs at their contract limits. */
const MAX_PUSH_SEND_BODY_BYTES = 16 * 1024;

export function createDirectoryHandler(deps: DirectoryHandlerDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    const cors = decideCors(request.headers.get("Origin"), deps.allowedOrigins);
    if (request.method === "OPTIONS") return preflightResponse(cors);
    // A browser on an unlisted origin is refused outright so it cannot trigger side effects it could not read.
    if (cors.kind === "denied") return errorResponse("forbidden", "Origin not allowed.");
    return withCors(await handleRequest(request, deps), cors);
  };
}

async function handleRequest(request: Request, deps: DirectoryHandlerDeps): Promise<Response> {
  const match = matchRoute(request.method, new URL(request.url).pathname);
  if (match.kind === "not-found") return errorResponse("not-found", "Not found.");
  if (match.kind === "method-not-allowed") {
    return errorResponse("invalid", "Method not allowed.", { status: 405, headers: { Allow: match.allow.join(", ") } });
  }

  // Pushes are started only by the desktop runtime, never by a browser, even one on an allowed origin.
  if (match.route.kind === "push-send" && request.headers.get("Origin") !== null) {
    return errorResponse("forbidden", "Notifications can only be sent from a Nora computer.");
  }

  const userId = await authenticate(request, deps.verifier);
  if (userId === null) return errorResponse("unauthenticated", "Authentication required.");

  for (const scope of rateLimitScopes(match.route)) {
    if (!(await deps.rateLimiter.allow(scope, userId))) return errorResponse("rate-limited", "Too many requests. Try again shortly.");
  }

  try {
    return await dispatch(match.route, request, userId, deps);
  } catch (error) {
    if (error instanceof DirectoryFailure) return errorResponse(error.code, error.message);
    if (error instanceof UpstreamError) return errorResponse("upstream", "A dependency failed. Try again shortly.");
    return errorResponse("internal", "Unexpected server error.");
  }
}

async function dispatch(route: DirectoryRoute, request: Request, userId: string, deps: DirectoryHandlerDeps): Promise<Response> {
  const { service } = deps;
  switch (route.kind) {
    case "list":
      return contractResponse(listRuntimesResponseSchema, { runtimes: [...(await service.list(userId))] });
    case "provision": {
      const body = await readJsonBody(request, provisionRuntimeRequestSchema);
      return contractResponse(provisionRuntimeResponseSchema, await service.provision(userId, body));
    }
    case "rename": {
      const installationId = parseInstallationId(route.rawInstallationId);
      const body = await readJsonBody(request, renameRuntimeRequestSchema);
      return contractResponse(runtimeResponseSchema, { runtime: await service.rename(userId, installationId, body.name) });
    }
    case "delete": {
      const installationId = parseInstallationId(route.rawInstallationId);
      await service.remove(userId, installationId);
      return contractResponse(deleteRuntimeResponseSchema, { deleted: true, installationId });
    }
    case "rotate": {
      const installationId = parseInstallationId(route.rawInstallationId);
      return contractResponse(rotateRuntimeResponseSchema, await service.rotate(userId, installationId));
    }
    case "push-register": {
      const body = await readJsonBody(request, registerPushDeviceRequestSchema);
      return contractResponse(pushDeviceResponseSchema, { device: await deps.push.register(userId, body) });
    }
    case "push-unregister": {
      const deviceId = parsePathId(route.rawDeviceId, pushDeviceIdSchema, "Invalid device ID.");
      await deps.push.remove(userId, deviceId);
      return contractResponse(deletePushDeviceResponseSchema, { deleted: true, deviceId });
    }
    case "push-send": {
      const body = await readJsonBody(request, sendPushRequestSchema, MAX_PUSH_SEND_BODY_BYTES);
      return contractResponse(sendPushResponseSchema, await deps.push.send(userId, body));
    }
  }
}

function rateLimitScopes(route: DirectoryRoute): readonly RateLimitScope[] {
  switch (route.kind) {
    case "provision":
    case "rotate":
      return ["general", "provisioning"];
    case "push-register":
    case "push-unregister":
    case "push-send":
      return ["general", "push"];
    case "list":
    case "rename":
    case "delete":
      return ["general"];
  }
}

function parseInstallationId(raw: string): string {
  return parsePathId(raw, installationIdSchema, "Invalid installation ID.");
}

function parsePathId(raw: string, schema: z.ZodType<string>, message: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    throw new DirectoryFailure("invalid", message);
  }
  const parsed = schema.safeParse(decoded);
  if (!parsed.success) throw new DirectoryFailure("invalid", message);
  return parsed.data;
}

async function readJsonBody<T>(request: Request, schema: z.ZodType<T>, maxBytes = MAX_BODY_BYTES): Promise<T> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new DirectoryFailure("invalid", "Request body too large.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new DirectoryFailure("invalid", "Request body must be JSON.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new DirectoryFailure("invalid", "Request body failed validation.");
  return parsed.data;
}
