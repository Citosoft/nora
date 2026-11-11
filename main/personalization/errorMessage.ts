import { ExecutionCommandError } from "@main/execution/errors";
import { isNodeError } from "@main/nodeErrors";
import type { PersonalizationRequest } from "@shared/ipc/types/personalizationGateway.types";

export function personalizationErrorMessage(error: unknown, kind: PersonalizationRequest["kind"]): string {
  if (isNodeError(error) && error.code === "ERR_INVALID_STATE") {
    return "Nora's local execution host is no longer available. Quit Nora and open it again.";
  }
  if (error instanceof ExecutionCommandError) return error.message;
  if (kind === "boot") {
    return "Nora could not connect to its local execution host. Quit Nora and open it again.";
  }
  return "Nora could not save this setup. Check workspace storage and try again; your selection is preserved.";
}
