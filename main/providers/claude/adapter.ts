import type { ExecutionProvider, EmitProviderUpdate, ProviderExecution } from "@main/types/execution/provider.types";
import type { ClaudeActive, ClaudeOptions, ClaudePending, ClaudePrompt } from "@main/types/execution/claude.types";
import type { RequestResponse, RuntimeRequest, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { z } from "zod";

export class ClaudeAdapter implements ExecutionProvider {
  readonly kind = "claude";
  readonly instanceId: string;
  readonly capabilities = nativeCapabilities;
  private readonly active = new Map<string, ClaudeActive>();
  private readonly requests = new Map<string, ClaudePending>();
  constructor(private readonly options: ClaudeOptions) { this.instanceId = options.instanceId; }

  async catalog(workspace: WorkspaceRef): Promise<ProviderCatalogResult> {
    try {
      const discovery = await this.options.discover(workspace.path);
      return { status: "available", catalog: { kind: this.kind, instanceId: this.instanceId,
        capabilities: this.capabilities, ...discovery,
        policies: Object.entries(this.options.policies).filter(([, mode]) => mode !== "bypassPermissions").map(([id, mode]) => ({ id, label: mode })) } };
    } catch {
      return { status: "unavailable", failure: { code: "provider", message: "Claude model discovery is unavailable; check the configured runtime and authentication", retryable: true } };
    }
  }

  async start(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    const { snapshot, run } = execution;
    const base = { conversationId: snapshot.conversation.id, runId: run.id, attemptId: run.attemptId };
    const mode = this.options.policies[snapshot.conversation.provider.permissionPolicy];
    if (!mode || mode === "bypassPermissions") {
      emit({ ...base, eventId: "unsupported-policy", kind: "finished", status: "failed", usage: null,
        failure: { code: "unsupported", message: "Configure a supported Claude permission policy before sending", retryable: false } }); return;
    }
    const effort = z.enum(["low", "medium", "high", "xhigh", "max"]).nullable().safeParse(snapshot.conversation.provider.reasoning);
    if (!effort.success) {
      emit({ ...base, eventId: "unsupported-reasoning", kind: "finished", status: "failed", usage: null,
        failure: { code: "unsupported", message: "Select a supported Claude reasoning effort", retryable: false } }); return;
    }
    const sessionId = snapshot.conversation.nativeConversationId ?? this.options.nextId();
    const nativeTurnId = this.options.nextId();
    // Reserve the SDK-supported caller-supplied session ID durably before spawning.
    emit({ ...base, eventId: "native-binding", kind: "bound", nativeConversationId: sessionId });
    const session = this.options.open({ sessionId, resume: !!snapshot.conversation.nativeConversationId,
      nativeTurnId, instruction: run.instruction, cwd: snapshot.conversation.workspace.path,
      ...(snapshot.conversation.role ? { guidance: snapshot.conversation.role.guidance } : {}),
      model: snapshot.conversation.provider.model, permissionMode: mode,
      effort: effort.data,
      onRequest: (prompt) => this.ask(execution, prompt, emit) });
    this.active.set(run.attemptId, { ...execution, emit, session });
    let completed = false;
    const timestamps = new Map(snapshot.items.map((item) => [item.id, item.createdAt]));
    const itemTime = (nativeId: string, kind: string): string => {
      const id = JSON.stringify([run.id, nativeId, kind]);
      const at = timestamps.get(id) ?? this.options.now();
      timestamps.set(id, at);
      return at;
    };
    try {
      for await (const frame of session) {
        switch (frame.kind) {
          case "init":
            if (frame.sessionId !== sessionId) throw new Error("Claude session identity changed");
            emit({ ...base, eventId: frame.eventId, kind: "started", nativeConversationId: sessionId, nativeTurnId }); break;
          case "text":
          case "reasoning":
            emit({ ...base, eventId: frame.eventId, kind: "item", item: frame.kind === "text"
              ? { kind: "message", role: "assistant", id: JSON.stringify([run.id, frame.nativeId, "text"]), runId: run.id,
                createdAt: itemTime(frame.nativeId, "text"), text: frame.text, complete: frame.complete }
              : { kind: "reasoning", id: JSON.stringify([run.id, frame.nativeId, "reasoning"]), runId: run.id,
                createdAt: itemTime(frame.nativeId, "reasoning"), text: frame.text, complete: frame.complete } }); break;
          case "tool":
            emit({ ...base, eventId: frame.eventId, kind: "item", item: { kind: "tool", id: JSON.stringify([run.id, frame.nativeId, "tool"]), runId: run.id,
              createdAt: itemTime(frame.nativeId, "tool"), label: frame.label, output: frame.output, state: frame.state } }); break;
          case "finished":
            completed = true;
            emit({ ...base, eventId: frame.eventId, kind: "finished", status: frame.status, failure: frame.failure, usage: frame.usage }); break;
        }
      }
      if (!completed) throw new Error("Claude stream ended without a result");
    } finally {
      this.active.delete(run.attemptId);
      for (const [id, pending] of this.requests) {
        if (pending.attemptId === run.attemptId) { pending.reject(new Error("Claude request expired")); this.requests.delete(id); }
      }
      await session.close();
    }
  }

  private ask(execution: ProviderExecution, prompt: ClaudePrompt, emit: EmitProviderUpdate): Promise<RequestResponse> {
    const { run, snapshot } = execution;
    const id = JSON.stringify([run.id, prompt.nativeId]);
    const common = { id, runId: run.id, attemptId: run.attemptId, nativeId: prompt.nativeId, title: prompt.title,
      status: "pending" as const, createdAt: this.options.now(), expiresAt: new Date(Date.parse(this.options.now()) + (this.options.requestLifetimeMs ?? 30 * 60_000)).toISOString() };
    const request: RuntimeRequest = prompt.kind === "question" ? { ...common, kind: "question", questions: prompt.questions }
      : { ...common, kind: "approval", options: [{ id: "allow", label: "Allow once" }, { id: "deny", label: "Decline" }] };
    return new Promise<RequestResponse>((resolve, reject) => {
      const expire = (): void => {
        cleanup(); this.requests.delete(id);
        try { emit({ kind: "request-expired", eventId: `expired:${id}`, conversationId: snapshot.conversation.id,
          runId: run.id, attemptId: run.attemptId, requestId: id }); }
        finally { reject(new Error("Native request expired")); }
      };
      const timeout = setTimeout(expire, this.options.requestLifetimeMs ?? 30 * 60_000);
      timeout.unref();
      const cleanup = (): void => { clearTimeout(timeout); prompt.signal.removeEventListener("abort", expire); };
      if (prompt.signal.aborted) { expire(); return; }
      prompt.signal.addEventListener("abort", expire, { once: true });
      this.requests.set(id, { attemptId: run.attemptId, resolve: (response) => {
        cleanup(); resolve(response);
      }, reject: (error) => { cleanup(); reject(error); } });
      try { emit({ kind: "request", eventId: `request:${id}`, conversationId: snapshot.conversation.id, runId: run.id, attemptId: run.attemptId, request }); }
      catch (error) { this.requests.delete(id); cleanup(); reject(error); }
    });
  }

  async respond(execution: ProviderExecution, request: RuntimeRequest, response: RequestResponse, emit: EmitProviderUpdate): Promise<void> {
    const pending = this.requests.get(request.id);
    if (!pending || pending.attemptId !== execution.run.attemptId) throw new Error("Native request expired");
    pending.resolve(response); this.requests.delete(request.id);
    emit({ kind: "request-resolved", eventId: `resolved:${request.id}`, conversationId: execution.snapshot.conversation.id,
      runId: execution.run.id, attemptId: execution.run.attemptId, requestId: request.id });
  }
  async interrupt(execution: ProviderExecution): Promise<void> {
    const active = this.active.get(execution.run.attemptId);
    if (!active) throw new Error("Claude owner is not reachable");
    await active.session.interrupt();
  }
  async reconcile(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    // SDK history is not an authoritative live-turn/approval lookup. Never resume by resending.
    emit({ kind: "disconnected", eventId: `reconcile:${this.options.nextId()}`, conversationId: execution.snapshot.conversation.id,
      runId: execution.run.id, attemptId: execution.run.attemptId,
      failure: { code: "uncertain", message: "Claude native turn status cannot be confirmed after owner loss; automatic resubmission is disabled", retryable: false } });
  }
  async close(): Promise<void> {
    await Promise.all([...this.active.values()].map((active) => active.session.close()));
  }
}
