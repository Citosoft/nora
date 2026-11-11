import { ExecutionCommandError } from "@main/execution/errors";
import { isNodeError } from "@main/nodeErrors";

/** A stale saved selection must not prevent the rest of the application from starting. */
export async function restoreWorkspaceSelection(restore: () => Promise<void>): Promise<void> {
  try {
    await restore();
  } catch (error) {
    const unavailableCheckout = error instanceof ExecutionCommandError && ["conflict", "invalid", "missing"].includes(error.code);
    const missingFolder = isNodeError(error) && (error.code === "ENOENT" || error.code === "ENOTDIR");
    if (!unavailableCheckout && !missingFolder) {
      throw error;
    }
    console.warn("Saved workspace could not be restored:", error instanceof Error ? error.message : "Workspace unavailable");
  }
}
