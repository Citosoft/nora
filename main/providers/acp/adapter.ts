import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { methods } from "@agentclientprotocol/sdk";
import type { NewSessionRequest, RequestPermissionRequest, RequestPermissionResponse, SessionNotification, ToolCall, ToolCallUpdate } from "@agentclientprotocol/sdk";
import type { AcpLiveConnection, AcpOptions, AcpPendingPermission, AcpSessionSetup, AcpStreamState, AcpTurn } from "@main/types/execution/acp.types";
import type { EmitProviderUpdate, ExecutionProvider, ProviderExecution } from "@main/types/execution/provider.types";
import type { ExecutionFailure, RequestResponse, RuntimeRequest, TimelineItem, ToolActivity, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ProviderCapabilities } from "@shared/types/provider/capabilities.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { McpResult } from "@shared/types/provider/mcp.types";
import type { ProviderAccountAction, ProviderAccountResult } from "@shared/types/provider/account.types";
import type { AcpProviderKind } from "@shared/types/provider/providerKind.types";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { openAcpConnection, withAcpTimeout } from "./connection";
import { acpFailure, isAcpAgentResponse, isAcpAuthRequired } from "./errors";
import { acpApprovalDetails, acpApprovalOptions, acpPlanSteps, acpStreamText, acpTurnOutcome, applyAcpToolUpdate } from "./normalize";
import { acpControlChanges, acpControlPlan } from "./sessionControls";

const DEFAULT_REQUEST_LIFETIME_MS = 30 * 60_000;
const DEFAULT_SETUP_TIMEOUT_MS = 30_000;
const DEFAULT_CATALOG_TTL_MS = 5 * 60_000;
const LOGIN_REJECTION_WINDOW_MS = 3_000;
type StreamKind = "message" | "reasoning";

/** Drives any Agent Client Protocol agent through Nora's provider contract; one agent process serves every session. */
export class AcpAdapter implements ExecutionProvider {
  readonly kind: AcpProviderKind;
  readonly instanceId: string;
  private live: Promise<AcpLiveConnection> | null = null;
  private resumable: boolean | null = null;
  private readonly bySession = new Map<string, AcpTurn>();
  private readonly byAttempt = new Map<string, AcpTurn>();
  private readonly permissions = new Map<string, AcpPendingPermission>();
  private readonly catalogs = new Map<string, { at: number; result: Promise<ProviderCatalogResult> }>();
  private permissionSequence = 0;

  constructor(private readonly options: AcpOptions) {
    this.kind = options.kind;
    this.instanceId = options.instanceId;
  }

  /** ACP has no structured question or steering channel; resume follows what the agent advertised once connected. */
  get capabilities(): ProviderCapabilities {
    return { ...nativeCapabilities, questions: false, steering: false, turnChanges: false, resume: this.resumable ?? true };
  }

  private connect(): Promise<AcpLiveConnection> {
    if (!this.live) {
      const pending: Promise<AcpLiveConnection> = openAcpConnection(this.options, {
        onUpdate: (notification) => this.onUpdate(notification),
        onPermission: (request, signal) => this.onPermission(request, signal),
        onExit: () => this.onExit(pending)
      });
      this.live = pending;
      pending.then((live) => {
        const capabilities = live.init.agentCapabilities;
        this.resumable = Boolean(capabilities?.loadSession || capabilities?.sessionCapabilities?.resume);
      }, () => { if (this.live === pending) this.live = null; });
    }
    return this.live;
  }

  private onExit(connection: Promise<AcpLiveConnection>): void {
    if (this.live === connection) this.live = null;
    this.catalogs.clear();
    for (const [id, pending] of this.permissions) { this.permissions.delete(id); pending.resolve({ outcome: "cancelled" }); }
  }

  private timeout<T>(work: Promise<T>, message: string): Promise<T> {
    return withAcpTimeout(work, this.options.setupTimeoutMs ?? DEFAULT_SETUP_TIMEOUT_MS, message);
  }

  async mcp(): Promise<McpResult> {
    return { kind: "unavailable", message: `${this.options.label} does not report MCP server status over ACP yet. Manage its MCP servers in ${this.options.label}.` };
  }

  async catalog(workspace: WorkspaceRef): Promise<ProviderCatalogResult> {
    const cached = this.catalogs.get(workspace.path);
    if (cached && Date.now() - cached.at < (this.options.catalogTtlMs ?? DEFAULT_CATALOG_TTL_MS)) return cached.result;
    const result = this.readCatalog(workspace.path);
    this.catalogs.set(workspace.path, { at: Date.now(), result });
    void result.then((value) => { if (value.status === "unavailable") this.catalogs.delete(workspace.path); });
    return result;
  }

  /** Models and modes are per-session in ACP, so discovery opens a probe session that never receives a prompt. */
  private async readCatalog(cwd: string): Promise<ProviderCatalogResult> {
    const available = (setup: AcpSessionSetup, authentication: "required" | "present" | "unknown"): ProviderCatalogResult => ({ status: "available",
      catalog: { kind: this.kind, instanceId: this.instanceId, capabilities: this.capabilities, ...acpControlPlan(setup, this.options.label), authentication } });
    try {
      const live = await this.connect();
      try {
        const session = await this.timeout(live.agent.request(methods.agent.session.new, { cwd, mcpServers: [] }), `${this.options.label} did not open a session`);
        void this.closeProbe(live, session.sessionId);
        return available(session, "present");
      } catch (error) {
        if (isAcpAuthRequired(error)) return available({}, "required");
        throw error;
      }
    } catch {
      return { status: "unavailable", failure: { code: "provider", message: `${this.options.label} discovery is unavailable; check that it is installed and configured`, retryable: true } };
    }
  }

  private async closeProbe(live: AcpLiveConnection, sessionId: string): Promise<void> {
    if (!live.init.agentCapabilities?.sessionCapabilities?.close) return;
    await live.agent.request(methods.agent.session.close, { sessionId }).catch(() => {});
  }

  async account(action: ProviderAccountAction): Promise<ProviderAccountResult> {
    let live: AcpLiveConnection;
    try { live = await this.connect(); }
    catch { return { kind: "unavailable", message: `${this.options.label} could not be started. Check that it is installed, then refresh.` }; }
    if (action.kind === "login") {
      const method = live.init.authMethods?.find((entry) => !("type" in entry) || entry.type !== "terminal");
      if (!method) return { kind: "unavailable", message: `Sign in to ${this.options.label} using its own command-line sign-in, then refresh.` };
      // Agent-handled sign-in completes outside Nora (usually in a browser), so it is not awaited; the client re-reads the
      // account until it changes. A quick rejection (e.g. an unsupported account type) is reported instead of waiting.
      const authentication = live.agent.request(methods.agent.authenticate, { methodId: method.id }).then(() => null, (error: unknown) => error);
      void authentication.finally(() => this.catalogs.clear());
      const early = await Promise.race([authentication, new Promise<"pending">((resolve) => { setTimeout(() => resolve("pending"), LOGIN_REJECTION_WINDOW_MS).unref(); })]);
      if (early === "pending" || early === null) return { kind: "login-started" };
      return { kind: "unavailable", message: early instanceof Error && early.message ? `${this.options.label} sign-in failed: ${early.message.slice(0, 300)}` : `${this.options.label} sign-in failed. Sign in using its own command-line sign-in, then refresh.` };
    }
    try {
      const session = await this.timeout(live.agent.request(methods.agent.session.new, { cwd: homedir(), mcpServers: [] }), `${this.options.label} did not open a session`);
      void this.closeProbe(live, session.sessionId);
      return { kind: "account", account: { state: "signed-in", method: live.init.agentInfo?.title ?? this.options.label, label: null } };
    } catch (error) {
      if (isAcpAuthRequired(error)) return { kind: "account", account: { state: "signed-out" } };
      return { kind: "unavailable", message: `${this.options.label}'s account could not be read. Check its configuration, then refresh.` };
    }
  }

  async start(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    const { run } = execution;
    const turn: AcpTurn = { execution, emit, sessionId: null, items: new Map(), message: null, reasoning: null, streams: 0, cancelled: false };
    this.byAttempt.set(run.attemptId, turn);
    try {
      await this.run(turn);
    } finally {
      if (turn.sessionId) this.bySession.delete(turn.sessionId);
      this.byAttempt.delete(run.attemptId);
      for (const [id, pending] of this.permissions) {
        if (pending.attemptId === run.attemptId) { this.permissions.delete(id); pending.resolve({ outcome: "cancelled" }); }
      }
    }
  }

  private async run(turn: AcpTurn): Promise<void> {
    const { execution, emit } = turn;
    const { snapshot, run } = execution;
    const base = { conversationId: snapshot.conversation.id, runId: run.id, attemptId: run.attemptId };
    const fail = (eventId: string, failure: ExecutionFailure): void => emit({ ...base, eventId, kind: "finished", status: "failed", usage: null, failure });
    const label = this.options.label;
    const cwd = snapshot.conversation.workspace.path;
    const guidance = snapshot.conversation.role?.guidance;
    let live: AcpLiveConnection;
    let sessionId: string;
    let setup: AcpSessionSetup;
    let promptGuidance = false;
    // Nothing has been prompted during setup, so every failure here is a definite, retryable failure.
    try {
      live = await this.connect();
      const capabilities = live.init.agentCapabilities;
      const existing = snapshot.conversation.nativeConversationId;
      if (existing) {
        sessionId = existing;
        if (capabilities?.sessionCapabilities?.resume) {
          setup = await this.timeout(live.agent.request(methods.agent.session.resume, { sessionId, cwd, mcpServers: [] }), `${label} did not resume the session`);
        } else if (capabilities?.loadSession) {
          // Replayed history arrives before the turn is registered, so it is not re-recorded.
          setup = await this.timeout(live.agent.request(methods.agent.session.load, { sessionId, cwd, mcpServers: [] }), `${label} did not load the session`);
        } else {
          fail("unsupported-resume", { code: "unsupported", message: `${label} cannot continue an existing conversation; start a new thread`, retryable: false });
          return;
        }
      } else {
        const request: NewSessionRequest = { cwd, mcpServers: [],
          ...(guidance && capabilities?.sessionCapabilities?.systemPrompt ? { systemPrompt: { mode: "append", content: [{ type: "text", text: guidance }] } } : {}) };
        const created = await this.timeout(live.agent.request(methods.agent.session.new, request), `${label} did not open a session`);
        sessionId = created.sessionId;
        setup = created;
        promptGuidance = Boolean(guidance) && !capabilities?.sessionCapabilities?.systemPrompt;
      }
    } catch (error) {
      fail("session-unavailable", isAcpAgentResponse(error) ? acpFailure(error, label)
        : { code: "provider", message: `${label} could not start; check that it is installed and configured, then retry`, retryable: true });
      return;
    }
    const controls = acpControlChanges(setup, snapshot.conversation.provider);
    if (!controls.ok) { fail("unsupported-controls", { code: "unsupported", message: controls.message, retryable: false }); return; }
    try {
      for (const change of controls.changes) {
        if (change.kind === "mode") await this.timeout(live.agent.request(methods.agent.session.setMode, { sessionId, modeId: change.modeId }), `${label} did not change mode`);
        else await this.timeout(live.agent.request(methods.agent.session.setConfigOption, { sessionId, configId: change.configId, value: change.value }), `${label} did not apply the selection`);
      }
    } catch (error) {
      fail("controls-unavailable", isAcpAgentResponse(error) ? acpFailure(error, label)
        : { code: "provider", message: `${label} did not apply the selected model or mode; retry`, retryable: true });
      return;
    }
    emit({ ...base, eventId: "native-binding", kind: "bound", nativeConversationId: sessionId });
    if (turn.cancelled) {
      emit({ ...base, eventId: "finished", kind: "finished", status: "interrupted", failure: null, usage: null });
      return;
    }
    turn.sessionId = sessionId;
    this.bySession.set(sessionId, turn);
    // ACP prompts have no turn id, so the attempt id identifies this native turn.
    emit({ ...base, eventId: "native-start", kind: "started", nativeConversationId: sessionId, nativeTurnId: run.attemptId });
    const text = promptGuidance && guidance ? `${guidance}\n\n${run.instruction}` : run.instruction;
    try {
      const response = await Promise.race([live.agent.request(methods.agent.session.prompt, { sessionId, prompt: [{ type: "text", text }] }),
        live.closed.then(() => { throw new Error(`${label} exited during the turn`); })]);
      this.closeStreams(turn);
      const outcome = acpTurnOutcome(response.stopReason, label);
      this.settleTools(turn, outcome.status === "interrupted" ? "interrupted" : outcome.status === "failed" ? "failed" : "unconfirmed");
      emit({ ...base, eventId: "finished", kind: "finished", status: outcome.status, failure: outcome.failure, usage: null });
    } catch (error) {
      this.closeStreams(turn);
      if (isAcpAgentResponse(error)) {
        this.settleTools(turn, "failed");
        emit({ ...base, eventId: "finished", kind: "finished", status: "failed", failure: acpFailure(error, label), usage: null });
      } else {
        // The prompt may have run; never claim an outcome or resubmit.
        this.settleTools(turn, "unconfirmed");
        emit({ ...base, eventId: "connection-lost", kind: "disconnected",
          failure: { code: "disconnected", message: `${label} disconnected; the turn's outcome is unconfirmed`, retryable: false } });
      }
    }
  }

  private onUpdate({ sessionId, update }: SessionNotification): void {
    const turn = this.bySession.get(sessionId);
    if (!turn) return;
    switch (update.sessionUpdate) {
      case "agent_message_chunk": this.stream(turn, "message", acpStreamText(update.content)); break;
      case "agent_thought_chunk": this.stream(turn, "reasoning", acpStreamText(update.content)); break;
      case "tool_call":
      case "tool_call_update": this.closeStreams(turn); this.tool(turn, update); break;
      case "plan": {
        const { run } = turn.execution;
        const id = JSON.stringify([run.id, "plan"]);
        this.item(turn, { id, runId: run.id, createdAt: turn.items.get(id)?.createdAt ?? this.options.now(), kind: "plan", steps: acpPlanSteps(update.entries) });
        break;
      }
      default: break;
    }
  }

  private stream(turn: AcpTurn, kind: StreamKind, text: string): void {
    if (!text) return;
    const other: StreamKind = kind === "message" ? "reasoning" : "message";
    if (turn[other]) this.completeStream(turn, other);
    const state: AcpStreamState = turn[kind] ?? { index: turn.streams++, text: "", createdAt: this.options.now() };
    state.text += text;
    turn[kind] = state;
    this.emitStream(turn, kind, state, false);
  }

  private emitStream(turn: AcpTurn, kind: StreamKind, state: AcpStreamState, complete: boolean): void {
    const { run } = turn.execution;
    const common = { id: JSON.stringify([run.id, kind, state.index]), runId: run.id, createdAt: state.createdAt, text: state.text, complete };
    this.item(turn, kind === "message" ? { ...common, kind: "message", role: "assistant" } : { ...common, kind: "reasoning" });
  }

  private completeStream(turn: AcpTurn, kind: StreamKind): void {
    const state = turn[kind];
    if (!state) return;
    turn[kind] = null;
    this.emitStream(turn, kind, state, true);
  }

  private closeStreams(turn: AcpTurn): void {
    this.completeStream(turn, "reasoning");
    this.completeStream(turn, "message");
  }

  private tool(turn: AcpTurn, update: ToolCall | ToolCallUpdate): void {
    const { run } = turn.execution;
    const id = JSON.stringify([run.id, "tool", update.toolCallId]);
    const previous = turn.items.get(id);
    const tool = applyAcpToolUpdate(previous?.kind === "tool" ? previous : undefined, update,
      { id, runId: run.id, createdAt: previous?.createdAt ?? this.options.now() });
    if (tool) this.item(turn, tool);
  }

  /** Event ids are content hashes: a repeated identical item is deduplicated, and a changed one never reuses an id. */
  private item(turn: AcpTurn, item: TimelineItem): void {
    const { snapshot, run } = turn.execution;
    turn.items.set(item.id, item);
    const eventId = `item:${createHash("sha256").update(JSON.stringify(item)).digest("hex").slice(0, 32)}`;
    turn.emit({ kind: "item", eventId, conversationId: snapshot.conversation.id, runId: run.id, attemptId: run.attemptId, item });
  }

  private settleTools(turn: AcpTurn, state: "unconfirmed" | "failed" | "interrupted"): void {
    for (const item of turn.items.values()) {
      if (item.kind !== "tool" || item.state !== "running") continue;
      const settled: ToolActivity = { ...item, state, details: { ...item.details, category: item.details?.category ?? "other",
        detail: state === "unconfirmed" ? "No final tool result was received." : "The task stopped before this tool finished." } };
      this.item(turn, settled);
    }
  }

  private onPermission(params: RequestPermissionRequest, signal: AbortSignal): Promise<RequestPermissionResponse> {
    const turn = this.bySession.get(params.sessionId);
    if (!turn || turn.cancelled || !params.options.length) return Promise.resolve({ outcome: { outcome: "cancelled" } });
    this.closeStreams(turn);
    this.tool(turn, params.toolCall);
    const { snapshot, run } = turn.execution;
    const id = JSON.stringify([run.id, "permission", params.toolCall.toolCallId, this.permissionSequence++]);
    const now = this.options.now();
    const lifetime = this.options.requestLifetimeMs ?? DEFAULT_REQUEST_LIFETIME_MS;
    const details = acpApprovalDetails(params.toolCall);
    const request: RuntimeRequest = { id, runId: run.id, attemptId: run.attemptId, nativeId: params.toolCall.toolCallId, status: "pending",
      createdAt: now, expiresAt: new Date(Date.parse(now) + lifetime).toISOString(), kind: "approval",
      title: params.toolCall.title || `Allow ${this.options.label} to continue?`, options: acpApprovalOptions(params.options), ...(details ? { details } : {}) };
    const base = { conversationId: snapshot.conversation.id, runId: run.id, attemptId: run.attemptId };
    return new Promise<RequestPermissionResponse>((resolve) => {
      const settle = (outcome: RequestPermissionResponse["outcome"]): void => {
        clearTimeout(timer);
        signal.removeEventListener("abort", expire);
        this.permissions.delete(id);
        resolve({ outcome });
      };
      const expire = (): void => {
        if (!this.permissions.has(id)) return;
        settle({ outcome: "cancelled" });
        try { turn.emit({ ...base, kind: "request-expired", eventId: `expired:${id}`, requestId: id }); } catch { /* The run already ended. */ }
      };
      const timer = setTimeout(expire, lifetime);
      timer.unref();
      signal.addEventListener("abort", expire, { once: true });
      this.permissions.set(id, { attemptId: run.attemptId, optionIds: new Set(params.options.map((option) => option.optionId)), resolve: settle });
      try { turn.emit({ ...base, kind: "request", eventId: `request:${id}`, request }); }
      catch { settle({ outcome: "cancelled" }); }
    });
  }

  async respond(execution: ProviderExecution, request: RuntimeRequest, response: RequestResponse, emit: EmitProviderUpdate): Promise<void> {
    const pending = this.permissions.get(request.id);
    if (!pending || pending.attemptId !== execution.run.attemptId) throw new Error("Native request expired");
    if (response.kind !== "approval" || !pending.optionIds.has(response.optionId)) throw new Error("Unsupported approval response");
    pending.resolve({ outcome: "selected", optionId: response.optionId });
    emit({ kind: "request-resolved", eventId: `resolved:${request.id}`, conversationId: execution.snapshot.conversation.id,
      runId: execution.run.id, attemptId: execution.run.attemptId, requestId: request.id });
  }

  /** ACP cancellation: answer open permission prompts as cancelled, then `session/cancel`; the prompt reply confirms it. */
  async interrupt(execution: ProviderExecution): Promise<void> {
    const turn = this.byAttempt.get(execution.run.attemptId);
    if (!turn) throw new Error(`${this.options.label} owner is not reachable`);
    turn.cancelled = true;
    for (const [id, pending] of this.permissions) {
      if (pending.attemptId === execution.run.attemptId) { this.permissions.delete(id); pending.resolve({ outcome: "cancelled" }); }
    }
    // Before setup finishes there is no session yet; start sees the flag and finishes as interrupted without prompting.
    if (turn.sessionId) await (await this.connect()).agent.notify(methods.agent.session.cancel, { sessionId: turn.sessionId });
  }

  async reconcile(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    // ACP has no turn ids to prove what a lost prompt did, so the outcome stays unconfirmed and is never resent.
    emit({ kind: "disconnected", eventId: `reconcile:${execution.run.attemptId}`, conversationId: execution.snapshot.conversation.id,
      runId: execution.run.id, attemptId: execution.run.attemptId,
      failure: { code: "uncertain", message: `${this.options.label} turn status cannot be confirmed after owner loss; automatic resubmission is disabled`, retryable: false } });
  }

  async close(): Promise<void> {
    const live = this.live;
    this.live = null;
    if (live) (await live.catch(() => null))?.close();
  }
}
