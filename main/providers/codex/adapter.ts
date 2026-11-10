import { spawn } from "node:child_process";
import { APP_VERSION } from "@shared/appMeta";
import { z } from "zod";
import type { ExecutionProvider, EmitProviderUpdate, ProviderExecution } from "@main/types/execution/provider.types";
import type { CodexActive, CodexOptions, CodexPendingRequest } from "@main/types/execution/codex.types";
import type { JsonValue } from "@main/types/execution/rpc.types";
import type { ExecutionFailure, RequestResponse, RuntimeRequest, TimelineItem, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import { StdioRpc } from "./stdioRpc";
import { readCodexModels } from "./catalog";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { initializedSchema, threadSchema, turnSchema } from "./rpcSchemas";
import { accountSchema, approvalSchema, deltaSchema, itemEventSchema, questionSchema, readThreadSchema, reasoningEffortSchema, routingSchema, turnEventSchema, usageEventSchema } from "./nativeSchemas";

/** Structured protocol boundary; capabilities are discovered from the configured runtime. */
export class CodexAdapter implements ExecutionProvider {
  readonly kind = "codex";
  readonly instanceId: string;
  readonly capabilities = Object.freeze({ ...nativeCapabilities, turnChanges: true });
  private connection: Promise<StdioRpc> | null = null;
  private readonly byThread = new Map<string, CodexActive>();
  private readonly byAttempt = new Map<string, CodexActive>();
  private readonly requests = new Map<string, CodexPendingRequest>();

  constructor(private readonly options: CodexOptions) { this.instanceId = options.instanceId; }

  async catalog(_workspace: WorkspaceRef): Promise<ProviderCatalogResult> {
    try {
      const rpc = await this.connect();
      const account = await rpc.request("account/read", { refreshToken: false }, accountSchema);
      const models = await readCodexModels(rpc);
      return { status: "available", catalog: { kind: this.kind, instanceId: this.instanceId, capabilities: this.capabilities,
        models, policies: Object.entries(this.options.policies).map(([id, policy]) => ({ id, label: `${policy.approvalPolicy} · ${policy.sandbox}` })),
        authentication: account.account || !account.requiresOpenaiAuth ? "present" : "required" } };
    } catch {
      return { status: "unavailable", failure: { code: "provider", message: "Codex model discovery is unavailable; check the configured runtime and authentication", retryable: true } };
    }
  }

  private connect(): Promise<StdioRpc> {
    if (!this.connection) {
      this.connection = (async () => {
        const process = spawn(this.options.executable, this.options.arguments ?? ["app-server", "--listen", "stdio://"], {
          env: { ...global.process.env, ...this.options.environment }, stdio: "pipe", windowsHide: true
        });
        const rpc = new StdioRpc({ process, onNotification: this.onNotification.bind(this), onRequest: this.onRequest.bind(this), onDisconnect: () => {
          this.connection = null;
          for (const active of this.byAttempt.values()) {
            active.rejectReady(new Error("Codex disconnected"));
            this.emit(active, { kind: "disconnected", failure: { code: "disconnected", message: "Codex disconnected; turn outcome is unconfirmed", retryable: false } });
          }
          for (const request of this.requests.values()) request.reject(new Error("Native request expired"));
          this.requests.clear(); this.byThread.clear(); this.byAttempt.clear();
        } });
        try {
          await rpc.request("initialize", { clientInfo: { name: "nora", title: "Nora", version: APP_VERSION }, capabilities: { experimentalApi: true } }, initializedSchema);
          rpc.notify("initialized", {});
          return rpc;
        } catch (error) { rpc.close(); throw error; }
      })();
    }
    return this.connection;
  }

  private emit(active: CodexActive, update: Omit<Extract<Parameters<EmitProviderUpdate>[0], { kind: "disconnected" }>, "eventId" | "conversationId" | "runId" | "attemptId">): void {
    active.emit({ ...update, eventId: "connection-lost", conversationId: active.snapshot.conversation.id, runId: active.run.id, attemptId: active.run.attemptId });
  }

  async start(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    const { snapshot, run } = execution;
    const base = { conversationId: snapshot.conversation.id, runId: run.id, attemptId: run.attemptId };
    let resolveReady: CodexActive["resolveReady"] = () => {};
    let rejectReady: CodexActive["rejectReady"] = () => {};
    const ready = new Promise<string>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    void ready.catch(() => {});
    const active: CodexActive = { ...execution, emit, items: new Map(), usage: null, nativeTurnId: null, ready, resolveReady, rejectReady };
    this.byAttempt.set(run.attemptId, active);
    const fail = (eventId: string, failure: ExecutionFailure): void => {
      emit({ ...base, eventId, kind: "finished", status: "failed", usage: null, failure });
      this.byAttempt.delete(run.attemptId);
    };
    const policy = this.options.policies[snapshot.conversation.provider.permissionPolicy];
    const effort = reasoningEffortSchema.nullable().safeParse(snapshot.conversation.provider.reasoning);
    if (!policy) {
      fail("unsupported-policy", { code: "unsupported", message: "Configure a supported Codex permission policy before sending", retryable: false });
      return;
    }
    if (!effort.success) {
      fail("unsupported-reasoning", { code: "unsupported", message: "Select a supported Codex reasoning effort", retryable: false });
      return;
    }
    let rpc: StdioRpc;
    try {
      rpc = await this.connect();
      const account = await rpc.request("account/read", { refreshToken: false }, accountSchema);
      if (account.requiresOpenaiAuth && !account.account) {
        fail("authentication-required", { code: "authentication", message: "Sign in to the configured Codex account before sending", retryable: true });
        return;
      }
      if (effort.data) {
        const model = (await readCodexModels(rpc)).find((entry) => entry.id === snapshot.conversation.provider.model);
        if (!model?.reasoningEfforts.includes(effort.data)) {
          fail("unsupported-reasoning", { code: "unsupported", message: "Select a reasoning effort advertised for this Codex model", retryable: false });
          return;
        }
      }
    } catch {
      // No thread/turn instruction has crossed the native boundary during readiness checks.
      fail("readiness-unavailable", { code: "provider", message: "Codex runtime readiness is unavailable; check its configuration and sign-in before retrying", retryable: true });
      return;
    }
    const params = { model: snapshot.conversation.provider.model, cwd: snapshot.conversation.workspace.path, ...policy,
      ...(snapshot.conversation.role ? { developerInstructions: snapshot.conversation.role.guidance } : {}) };
    const binding = snapshot.conversation.nativeConversationId
      ? await rpc.request("thread/resume", { threadId: snapshot.conversation.nativeConversationId, ...params }, threadSchema)
      : await rpc.request("thread/start", params, threadSchema);
    emit({ ...base, eventId: "native-binding", kind: "bound", nativeConversationId: binding.thread.id });
    this.byThread.set(binding.thread.id, active);
    const turn = await rpc.request("turn/start", { threadId: binding.thread.id,
      input: [{ type: "text", text: run.instruction }],
      ...(effort.data ? { effort: effort.data } : {}) }, turnSchema);
    active.nativeTurnId = turn.turn.id;
    active.resolveReady(turn.turn.id);
    emit({ ...base, eventId: "native-start", kind: "started", nativeConversationId: binding.thread.id, nativeTurnId: turn.turn.id });
  }

  private onNotification(method: string, params: JsonValue): void {
    const routing = routingSchema.safeParse(params);
    if (!routing.success) return;
    const active = this.byThread.get(routing.data.threadId);
    if (!active) return;
    const base = { conversationId: active.snapshot.conversation.id, runId: active.run.id, attemptId: active.run.attemptId };
    if (method === "serverRequest/resolved") {
      const native = z.object({ requestId: z.union([z.string(), z.number()]) }).parse(params);
      const requestId = JSON.stringify([active.run.id, native.requestId]);
      const pending = this.requests.get(requestId);
      if (pending) { pending.reject(new Error("Native request was resolved elsewhere")); this.requests.delete(requestId); }
      active.emit({ ...base, kind: "request-resolved", eventId: `resolved:${requestId}`, requestId });
      return;
    }
    if (method === "turn/started" || method === "turn/completed") {
      const { threadId, turn } = turnEventSchema.parse(params);
      if (method === "turn/started") {
        active.nativeTurnId = turn.id; active.resolveReady(turn.id);
        active.emit({ ...base, eventId: "native-start", kind: "started", nativeConversationId: threadId, nativeTurnId: turn.id });
      } else if (active.nativeTurnId === turn.id) {
        this.finish(active, turn.id, turn.status, turn.error?.codexErrorInfo);
        for (const [id, pending] of this.requests) {
          if (pending.attemptId === active.run.attemptId) { pending.reject(new Error("Native turn ended")); this.requests.delete(id); }
        }
        this.byThread.delete(threadId); this.byAttempt.delete(active.run.attemptId);
      }
      return;
    }
    if (method === "thread/tokenUsage/updated") { active.usage = usageEventSchema.parse(params).tokenUsage.total; return; }
    if (method === "item/agentMessage/delta" || method === "item/commandExecution/outputDelta") {
      const delta = deltaSchema.parse(params);
      if (delta.turnId !== active.nativeTurnId) return;
      const id = JSON.stringify([active.run.id, delta.itemId]);
      const old = active.items.get(id);
      const item: TimelineItem = method === "item/agentMessage/delta"
        ? { id, runId: active.run.id, createdAt: old?.createdAt ?? this.options.now(), kind: "message", role: "assistant", complete: false,
          text: (old?.kind === "message" ? old.text : "") + delta.delta }
        : { id, runId: active.run.id, createdAt: old?.createdAt ?? this.options.now(), kind: "tool", label: old?.kind === "tool" ? old.label : "Command", state: "running",
          output: (old?.kind === "tool" ? old.output : "") + delta.delta };
      this.item(active, item, `${method}:${delta.itemId}:${item.kind === "message" ? item.text.length : item.kind === "tool" ? item.output.length : 0}`);
      return;
    }
    if (method === "item/started" || method === "item/completed") {
      const parsed = itemEventSchema.safeParse(params);
      // Other native item kinds remain unsupported rather than leaking their payloads.
      if (!parsed.success || parsed.data.turnId !== active.nativeTurnId) return;
      const native = parsed.data.item;
      const id = JSON.stringify([active.run.id, native.id]);
      const common = { id, runId: active.run.id,
        createdAt: active.items.get(id)?.createdAt ?? active.snapshot.items.find((item) => item.id === id)?.createdAt ?? this.options.now() };
      const complete = method === "item/completed";
      switch (native.type) {
        case "agentMessage": this.item(active, { ...common, kind: "message", role: "assistant", text: native.text, complete }, `${method}:${native.id}`); break;
        case "reasoning": this.item(active, { ...common, kind: "reasoning", text: [...native.summary, ...native.content].join("\n"), complete }, `${method}:${native.id}`); break;
        case "commandExecution": this.item(active, { ...common, kind: "tool", label: native.command, output: native.aggregatedOutput ?? "",
          state: native.status === "failed" ? "failed" : complete ? "completed" : "running" }, `${method}:${native.id}`); break;
        case "fileChange": this.item(active, { ...common, kind: "changes", paths: native.changes.map((change) => change.path), attribution: "turn" }, `${method}:${native.id}`); break;
      }
    }
  }

  private item(active: CodexActive, item: TimelineItem, eventId: string): void {
    active.items.set(item.id, item);
    active.emit({ kind: "item", eventId, conversationId: active.snapshot.conversation.id, runId: active.run.id, attemptId: active.run.attemptId, item });
  }

  private finish(active: CodexActive, id: string, status: string, errorInfo?: JsonValue): void {
    if (!["completed", "failed", "interrupted"].includes(status)) throw new Error("Unsupported native turn outcome");
    const failure: ExecutionFailure | null = status !== "failed" ? null
      : errorInfo === "unauthorized" ? { code: "authentication", message: "Sign in to the configured Codex account", retryable: true }
      : errorInfo === "usageLimitExceeded" ? { code: "usage-limit", message: "Codex usage limit reached", retryable: true }
      : { code: "provider", message: "Codex could not complete this turn", retryable: true };
    active.emit({ eventId: `finished:${id}`, conversationId: active.snapshot.conversation.id, runId: active.run.id, attemptId: active.run.attemptId,
      kind: "finished", status: status === "completed" ? "completed" : status === "failed" ? "failed" : "interrupted", failure, usage: active.usage });
  }

  private async onRequest(nativeId: string | number, method: string, params: JsonValue): Promise<JsonValue> {
    const { threadId } = routingSchema.parse(params);
    const active = this.byThread.get(threadId);
    if (!active) throw new Error("Request has no active owner");
    const id = JSON.stringify([active.run.id, nativeId]);
    const common = { id, nativeId: JSON.stringify(nativeId), runId: active.run.id, attemptId: active.run.attemptId, status: "pending" as const,
      createdAt: this.options.now(), expiresAt: new Date(Date.parse(this.options.now()) + (this.options.requestLifetimeMs ?? 30 * 60_000)).toISOString() };
    let request: RuntimeRequest;
    if (method === "item/tool/requestUserInput") {
      const native = questionSchema.parse(params);
      if (native.turnId !== active.nativeTurnId) throw new Error("Stale question");
      request = { ...common, kind: "question", title: "Codex needs input", questions: native.questions.map((question) => ({ id: question.id,
        text: question.question, options: question.isOther ? [] : question.options?.map((option) => option.label) ?? [], multiple: false })) };
    } else if (method === "item/commandExecution/requestApproval" || method === "item/fileChange/requestApproval") {
      const native = approvalSchema.parse(params);
      if (native.turnId !== active.nativeTurnId) throw new Error("Stale approval");
      const supported = z.enum(["accept", "acceptForSession", "decline", "cancel"]);
      const choices = native.availableDecisions ?? ["accept", "decline", "cancel"];
      const options = choices.flatMap((choice) => { const parsed = supported.safeParse(choice); return parsed.success ? [{ id: parsed.data,
        label: parsed.data === "accept" ? "Allow once" : parsed.data === "acceptForSession" ? "Allow for session" : parsed.data === "decline" ? "Decline" : "Cancel turn" }] : []; });
      if (!options.length) throw new Error("Unsupported native approval options");
      request = { ...common, kind: "approval", title: native.command ?? native.reason ?? "Approve file changes", options };
    } else throw new Error("Unsupported native request");
    return new Promise<JsonValue>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.requests.delete(id);
        try { active.emit({ kind: "request-expired", eventId: `expired:${id}`, conversationId: active.snapshot.conversation.id,
          runId: active.run.id, attemptId: active.run.attemptId, requestId: id }); }
        finally { reject(new Error("Native request expired")); }
      }, this.options.requestLifetimeMs ?? 30 * 60_000);
      timeout.unref();
      this.requests.set(id, { attemptId: active.run.attemptId,
        resolve: (response) => { clearTimeout(timeout); resolve(response); }, reject: (error) => { clearTimeout(timeout); reject(error); } });
      try { active.emit({ kind: "request", eventId: `request:${id}`, conversationId: active.snapshot.conversation.id, runId: active.run.id, attemptId: active.run.attemptId, request }); }
      catch (error) { this.requests.delete(id); clearTimeout(timeout); reject(error); }
    });
  }

  async respond(execution: ProviderExecution, request: RuntimeRequest, response: RequestResponse, emit: EmitProviderUpdate): Promise<void> {
    const pending = this.requests.get(request.id);
    if (!pending || pending.attemptId !== execution.run.attemptId) throw new Error("Native request expired");
    const result: JsonValue = response.kind === "approval" ? { decision: response.optionId }
      : { answers: Object.fromEntries(Object.entries(response.answers).map(([key, answers]) => [key, { answers }])) };
    pending.resolve(result); this.requests.delete(request.id);
    // Resolution is recorded only after serverRequest/resolved, not after writing to stdin.
    void emit;
  }

  async interrupt(execution: ProviderExecution): Promise<void> {
    const active = this.byAttempt.get(execution.run.attemptId);
    const nativeTurnId = active ? await active.ready : execution.run.nativeTurnId;
    const threadId = execution.snapshot.conversation.nativeConversationId;
    if (!nativeTurnId || !threadId) throw new Error("Native turn is not confirmed");
    await (await this.connect()).request("turn/interrupt", { threadId, turnId: nativeTurnId }, z.object({}));
  }

  async reconcile(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    const threadId = execution.snapshot.conversation.nativeConversationId;
    if (!threadId) throw new Error("Native session identity is unknown; submission must not be repeated");
    const rpc = await this.connect();
    const response = await rpc.request("thread/read", { threadId, includeTurns: true }, readThreadSchema);
    const turn = response.thread.turns.find((entry) => entry.id === execution.run.nativeTurnId);
    // Without an exact persisted native turn ID, even a recent turn is not proof of ownership.
    if (!turn) throw new Error("Cannot confirm the submitted native turn");
    if (turn.status === "inProgress") throw new Error("Turn is active in another owner; a read does not reconnect its live requests");
    const active: CodexActive = { ...execution, emit, nativeTurnId: turn.id, items: new Map(), usage: null,
      ready: Promise.resolve(turn.id), resolveReady() {}, rejectReady() {} };
    for (const item of turn.items) this.onRecoveredItem(active, threadId, turn.id, item);
    this.finish(active, turn.id, turn.status, turn.error?.codexErrorInfo);
  }
  private onRecoveredItem(active: CodexActive, threadId: string, turnId: string, item: JsonValue): void {
    this.byThread.set(threadId, active);
    try { this.onNotification("item/completed", { threadId, turnId, item }); }
    finally { this.byThread.delete(threadId); }
  }
  async close(): Promise<void> { if (this.connection) await (await this.connection).close(); }
}
