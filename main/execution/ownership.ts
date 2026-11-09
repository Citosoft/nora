import type { OwnershipDependencies } from "@main/types/execution/ownership.types";
import { ExecutionCommandError } from "./errors";

/** Liveness is checked outside the transaction; ownership changes use an atomic comparison. */
export class ExecutionOwnership {
  private acquired = false;
  constructor(private readonly deps: OwnershipDependencies) {}

  acquire(): void {
    if (this.acquired) { this.assertCurrent(); return; }
    const previous = this.deps.store.ownership();
    if (previous && this.deps.isProcessAlive(previous.processId)) {
      throw new ExecutionCommandError("conflict", "This execution environment already has a live owner");
    }
    if (!this.deps.store.claimOwnership(this.deps.owner, previous?.id ?? null)) {
      throw new ExecutionCommandError("conflict", "Execution ownership changed while reconnecting");
    }
    this.acquired = true;
  }
  assertCurrent(): void {
    if (!this.acquired || this.deps.store.ownership()?.id !== this.deps.owner.id) {
      throw new ExecutionCommandError("environment", "This process does not own the execution environment");
    }
  }
  release(): void {
    if (!this.acquired) return;
    if (!this.deps.store.releaseOwnership(this.deps.owner.id)) {
      throw new ExecutionCommandError("environment", "Execution ownership changed before release");
    }
    this.acquired = false;
  }
}

export function isProcessAlive(processId: number): boolean {
  try { process.kill(processId, 0); return true; }
  catch (error) {
    // Permission denied is not proof that another owner's process stopped.
    return !(error instanceof Error && "code" in error && error.code === "ESRCH");
  }
}
