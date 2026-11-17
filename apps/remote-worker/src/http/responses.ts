import { directoryErrorSchema } from "@shared/remote-access/directory";
import type { DirectoryErrorCode } from "@shared/types/remote-access/directory.types";
import type { z } from "zod";

const STATUS_BY_CODE: Readonly<Record<DirectoryErrorCode, number>> = {
  unauthenticated: 401,
  forbidden: 403,
  "not-found": 404,
  invalid: 400,
  quota: 409,
  conflict: 409,
  "rate-limited": 429,
  upstream: 502,
  internal: 500
};

const BASE_HEADERS: Readonly<Record<string, string>> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

export function jsonResponse(body: unknown, status = 200, headers: Readonly<Record<string, string>> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } });
}

/** Validates the outgoing body against its contract; a mismatch is a server bug and is reported as `internal`. */
export function contractResponse<T>(schema: z.ZodType<T>, body: T, status = 200): Response {
  const parsed = schema.safeParse(body);
  return parsed.success ? jsonResponse(parsed.data, status) : errorResponse("internal", "Unexpected server error.");
}

export function errorResponse(
  code: DirectoryErrorCode,
  message: string,
  options: { readonly status?: number; readonly headers?: Readonly<Record<string, string>> } = {}
): Response {
  const body = directoryErrorSchema.parse({ error: { code, message } });
  return jsonResponse(body, options.status ?? STATUS_BY_CODE[code], options.headers ?? {});
}
