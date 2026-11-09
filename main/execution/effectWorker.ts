import type { EmitProviderUpdate, ProviderResolver } from "@main/types/execution/provider.types";
import type { ExecutionEffect } from "@main/types/execution/store.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import { isActiveRun } from "./projection";
import { ConversationEngine } from "./engine";

export class EffectWorker {
  constructor(private readonly engine: ConversationEngine, private readonly providers: ProviderResolver,
    private readonly emit: EmitProviderUpdate = engine.accept.bind(engine),
    private readonly beforeStart?: (workspace: WorkspaceRef) => Promise<void>) {}

  /** Multiple calls may drain concurrently; claim is committed before any native side effect. */
  async runNext(allowed?: readonly ExecutionEffect["action"]["kind"][]): Promise<boolean> {
    const operation = this.beginNextEffect(allowed);
    if (!operation) return false;
    await operation;
    return true;
  }

  beginNextEffect(allowed?: readonly ExecutionEffect["action"]["kind"][]): Promise<void> | null {
    this.engine.expireRequests();
    const effect = this.engine.claimEffect(allowed);
    return effect ? this.perform(effect) : null;
  }

  private async perform(effect: ExecutionEffect): Promise<void> {
    let snapshot = this.engine.execution(effect.conversationId, effect.runId);
    let run = snapshot?.runs.find((entry) => entry.id === effect.runId);
    if (!snapshot || !run) throw new Error("Claimed effect has no execution owner");
    const emit = this.emit;
    try {
      if (effect.action.kind === "start" && this.beforeStart) {
        try { await this.beforeStart(snapshot.conversation.workspace); }
        catch {
          emit({ eventId: JSON.stringify([effect.id, "workspace"]), conversationId: effect.conversationId,
            runId: effect.runId, attemptId: effect.attemptId, kind: "finished", status: "failed", usage: null,
            failure: { code: "host", message: "Workspace is unavailable or has changed; review the checkout before retrying", retryable: true } });
          this.engine.finishEffect(effect.id); return;
        }
        // Interruption can arrive while filesystem checks await. No native instruction has been submitted.
        snapshot = this.engine.execution(effect.conversationId, effect.runId);
        run = snapshot?.runs.find((entry) => entry.id === effect.runId);
        if (!snapshot || !run) throw new Error("Prepared effect lost its execution owner");
        if (run.state !== "starting") {
          if (isActiveRun(run)) emit({ eventId: JSON.stringify([effect.id, "cancelled-before-start"]), conversationId: effect.conversationId,
            runId: effect.runId, attemptId: effect.attemptId, kind: "finished", status: "interrupted", failure: null, usage: null });
          this.engine.finishEffect(effect.id); return;
        }
      }
      const provider = this.providers.resolve(snapshot.conversation.provider.kind, snapshot.conversation.provider.instanceId);
      const execution = { snapshot, run };
      switch (effect.action.kind) {
        case "start": await provider.start(execution, emit); break;
        case "interrupt": await provider.interrupt(execution, emit); break;
        case "reconcile": await provider.reconcile(execution, emit); break;
        case "respond": {
          const { requestId } = effect.action;
          const request = snapshot.requests.find((entry) => entry.id === requestId);
          if (!request) throw new Error("Response effect has no native request");
          await provider.respond(execution, request, effect.action.response, emit);
          break;
        }
      }
      this.engine.finishEffect(effect.id);
    } catch {
      // A throw may occur after native acceptance. Preserve uncertainty rather than retrying.
      emit({ eventId: JSON.stringify([effect.id, "uncertain"]), conversationId: effect.conversationId,
        runId: effect.runId, attemptId: effect.attemptId, kind: "disconnected",
        failure: { code: "uncertain", message: "Provider connection failed; reconcile execution before retrying", retryable: false } });
      this.engine.finishEffect(effect.id);
    }
  }
}
