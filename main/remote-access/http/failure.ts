import { BotRevisionConflict } from "@main/bots/errors";
import { ZodError } from "zod";
import { ExecutionCommandError } from "@main/execution/errors";
import type { RuntimeApiErrorCode } from "@shared/types/remote-access/runtimeApi.types";
import type { RuntimeFailureDescription } from "@main/types/remote-access/http/runtime.types";

const STATUS: Record<RuntimeApiErrorCode, number> = { unauthenticated: 401, forbidden: 403, "not-found": 404, invalid: 400,
  conflict: 409, expired: 410, "cursor-unavailable": 410, unavailable: 503, "rate-limited": 429, "too-large": 413 };
export class RuntimeFailure extends Error {
  constructor(readonly code: RuntimeApiErrorCode, message: string) { super(message); }
}
export function describeRuntimeFailure(error: unknown): RuntimeFailureDescription {
  if (error instanceof BotRevisionConflict) return { code: "conflict", status: 409, message: error.message };
  if (error instanceof RuntimeFailure) return { code: error.code, status: STATUS[error.code], message: error.message };
  if (error instanceof ZodError || error instanceof SyntaxError || error instanceof URIError) return { code: "invalid", status: 400, message: "This request is invalid." };
  if (error instanceof ExecutionCommandError) {
    const code = error.code === "missing" ? "not-found" : error.code === "cursor" ? "cursor-unavailable" : error.code === "environment" ? "forbidden" : error.code;
    return { code, status: STATUS[code], message: error.message.slice(0, 500) };
  }
  return { code: "unavailable", status: 503, message: "This runtime could not complete the request. Try again." };
}
