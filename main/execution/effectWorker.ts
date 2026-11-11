import type { EmitProviderUpdate, ProviderResolver } from "@main/types/execution/provider.types";
import type { ExecutionEffect } from "@main/types/execution/store.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import { isActiveRun } from "./projection";
import { ConversationEngine } from "./engine";
import type { WorkspaceReviewer } from "@main/types/execution/review.types";
import type { TurnCheckpoints } from "@main/types/execution/checkpoints.types";
import { safeCapture } from "./checkpoints/safeCapture";
import { reviewExecution } from "./checkpoints/review";

export class EffectWorker {
  constructor(private readonly engine: ConversationEngine, private readonly providers: ProviderResolver,
    private readonly emit: EmitProviderUpdate = engine.accept.bind(engine),
    private readonly beforeStart?: (workspace: WorkspaceRef) => Promise<void>,
    private readonly reviewer: WorkspaceReviewer = async () => ({ status: "unavailable", reason: "unsupported" }),
    private readonly checkpoints?: TurnCheckpoints) {}

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
    if (effect.action.kind === "review") {
      const result = await reviewExecution(this.engine, effect, snapshot.conversation.workspace, this.reviewer, this.checkpoints);
      this.engine.finishReview(effect.id, result);
      return;
    }
    if (effect.action.kind === "start") {
      if (!await this.verifyWorkspace(effect, snapshot.conversation.workspace)) return;
      if (this.checkpoints) {
        const capture = await safeCapture(this.checkpoints, snapshot.conversation.workspace);
        this.engine.recordCheckpoint(effect.id, "baseline", capture);
        if (!await this.verifyWorkspace(effect, snapshot.conversation.workspace)) return;
      }
      // Interruption can arrive while preparation awaits. No native instruction has been submitted.
      snapshot = this.engine.execution(effect.conversationId, effect.runId);
      run = snapshot?.runs.find((entry) => entry.id === effect.runId);
      if (!snapshot || !run) throw new Error("Prepared effect lost its execution owner");
      if (run.state !== "starting") {
        if (isActiveRun(run)) this.emit({ eventId: JSON.stringify([effect.id, "cancelled-before-start"]), conversationId: effect.conversationId,
          runId: effect.runId, attemptId: effect.attemptId, kind: "finished", status: "interrupted", failure: null, usage: null });
        this.engine.finishEffect(effect.id); return;
      }
    }
    const emit = this.emit;
    if (effect.action.kind === "steer") {
      try {
        const provider = this.providers.resolve(snapshot.conversation.provider.kind, snapshot.conversation.provider.instanceId);
        const result = run.state !== "running" || !provider.steer || !provider.capabilities.steering
          ? { status: "rejected" as const, message: "The turn is no longer available for steering. The message remains queued." }
          : await provider.steer({ snapshot, run }, effect.action.instruction);
        this.engine.finishSteering(effect.id, result);
      } catch {
        this.engine.finishSteering(effect.id, { status: "unconfirmed", message: "Steering delivery is unconfirmed. This message will not run automatically." });
      }
      return;
    }
    try {
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
  private async verifyWorkspace(effect: ExecutionEffect, workspace: WorkspaceRef): Promise<boolean> {
    try { await this.beforeStart?.(workspace); }
    catch {
      this.emit({ eventId: JSON.stringify([effect.id, "workspace"]), conversationId: effect.conversationId,
        runId: effect.runId, attemptId: effect.attemptId, kind: "finished", status: "failed", usage: null,
        failure: { code: "host", message: "Workspace is unavailable or has changed; review the checkout before retrying", retryable: true } });
      this.engine.finishEffect(effect.id); return false;
    }
    return true;
  }

}
