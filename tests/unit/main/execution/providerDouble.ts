import type { ExecutionProvider, EmitProviderUpdate, ProviderExecution } from "@main/types/execution/provider.types";
import type { RequestResponse, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { DoubleExecution } from "./types/providerDouble.types";
import { nativeCapabilities } from "@main/execution/providerCapabilities";

export class ProviderDouble implements ExecutionProvider {
  readonly kind = "codex";
  readonly instanceId = "account-a";
  readonly capabilities = nativeCapabilities;
  readonly active = new Map<string, DoubleExecution>();
  starts = 0;
  constructor(private readonly confirmInterrupt = true, private readonly askOnStart = false, private readonly confirmReconcile = false) {}
  async catalog(): Promise<ProviderCatalogResult> {
    return { status: "unavailable", failure: { code: "unsupported", message: "Provider double", retryable: false } };
  }
  async start(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    this.starts++;
    await new Promise<void>((release) => {
      const active = { ...execution, emit, release };
      this.active.set(execution.run.attemptId, active);
      const base = this.identity(active);
      emit({ ...base, kind: "started", eventId: "started", nativeConversationId: `thread-${execution.snapshot.conversation.id}`, nativeTurnId: `turn-${execution.run.id}` });
      if (this.askOnStart) emit({ ...base, kind: "request", eventId: "request", request: {
        id: `${execution.run.id}-request`, nativeId: "native-request", runId: execution.run.id, attemptId: execution.run.attemptId,
        kind: "approval", status: "pending", title: "Allow?", createdAt: "2026-10-21T10:00:00.000Z", expiresAt: "2026-10-21T11:00:00.000Z",
        options: [{ id: "allow", label: "Allow once" }] } });
    });
  }
  async interrupt(execution: ProviderExecution): Promise<void> {
    if (this.confirmInterrupt) this.finish(execution.run.attemptId, "interrupted");
  }
  async respond(execution: ProviderExecution, request: RuntimeRequest, _response: RequestResponse, emit: EmitProviderUpdate): Promise<void> {
    emit({ ...this.identity({ ...execution, emit, release() {} }), kind: "request-resolved", eventId: "resolved", requestId: request.id });
    this.finish(execution.run.attemptId, "completed");
  }
  async reconcile(execution: ProviderExecution): Promise<void> {
    if (this.confirmReconcile) this.finish(execution.run.attemptId, "completed");
    else throw new Error("No native owner in provider double");
  }
  finish(attemptId: string, status: "completed" | "interrupted"): void {
    const active = this.active.get(attemptId);
    if (!active) throw new Error("No active native attempt");
    active.emit({ ...this.identity(active), kind: "finished", eventId: "finished", status, failure: null, usage: null });
    active.release(); this.active.delete(attemptId);
  }
  async close(): Promise<void> {
    for (const active of this.active.values()) {
      active.emit({ ...this.identity(active), kind: "disconnected", eventId: "closed",
        failure: { code: "disconnected", message: "Provider double closed without native confirmation", retryable: false } });
      active.release();
    }
    this.active.clear();
  }
  private identity(active: DoubleExecution) {
    return { conversationId: active.snapshot.conversation.id, runId: active.run.id, attemptId: active.run.attemptId };
  }
}
