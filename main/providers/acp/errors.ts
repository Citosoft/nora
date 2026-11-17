import { RequestError } from "@agentclientprotocol/sdk";
import type { ExecutionFailure } from "@shared/types/conversation/contracts.types";

/** ACP's `auth_required` error code: the agent needs `authenticate` before it will create or run sessions. */
const AUTH_REQUIRED = -32000;

export function isAcpAuthRequired(error: unknown): boolean {
  return error instanceof RequestError && error.code === AUTH_REQUIRED;
}

/** An error response means the agent answered, so the outcome is known; anything else (exit, timeout) is not. */
export function isAcpAgentResponse(error: unknown): error is RequestError {
  return error instanceof RequestError;
}

export function acpFailure(error: unknown, label: string): ExecutionFailure {
  if (isAcpAuthRequired(error)) return { code: "authentication", message: `Sign in to ${label} before sending`, retryable: true };
  return { code: "provider", message: `${label} could not run this request; check its configuration and sign-in, then retry`, retryable: true };
}
