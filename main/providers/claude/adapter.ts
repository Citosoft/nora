import { isReadOnlyToolScope, threadLoadsAccountExtras, threadToolScope } from "@main/execution/toolScope";
import { isBotOrChatThread } from "@shared/conversations/accountExtras";
import { instructionWithTurnNotes, joinGuidance, optionalRunContext, runMcpServers, workflowReviewMcpServers } from "@main/nora-tools/endpoint";
import { conversationGuidance } from "@shared/conversations/guidance";
import type { McpAction, McpResult } from "@shared/types/provider/mcp.types";
import type { SkillsResult } from "@shared/types/provider/skills.types";
import type { ProviderAccountAction, ProviderAccountResult } from "@shared/types/provider/account.types";
import type { ExecutionProvider, EmitProviderUpdate, ProviderExecution } from "@main/types/execution/provider.types";
import type { ClaudeActive, ClaudeLive, ClaudeOptions, ClaudePending, ClaudePrompt, ClaudeTurn } from "@main/types/execution/claude.types";
import type { FollowUpListener, ProviderFollowUpSource } from "@main/types/execution/followUp.types";
import type { BackgroundTasksListener, ProviderBackgroundTasksSource } from "@main/types/execution/backgroundTasks.types";
import type { BackgroundTask, ContextReading, Conversation, RequestResponse, RuntimeRequest, SubagentActivity, ToolActivity, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { z } from "zod";
import type { PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import { CLAUDE_ALLOW_AND_AUTO, claudeAutoSwitchPolicy, claudePermissionPolicy } from "./permissionPolicies";
import type { ProviderMcpAppAction, ProviderMcpAppResult } from "@main/types/execution/mcpApp.types";
import type { RunMcpServer } from "@main/types/nora-tools/noraTools.types";

/** Claude Code's slash command, which the SDK runs instead of sending the text to the model. */
const CLAUDE_COMPACT_COMMAND = "/compact";
/** How long an approval from a turn Claude started by itself waits for that turn's run to attach before it is declined. */
const FOLLOW_UP_ATTACH_MS = 30_000;

export class ClaudeAdapter implements ExecutionProvider {
  readonly kind = "claude";
  get externalSessions() { return this.options.externalSessions; }
  readonly instanceId: string;
  // The SDK reads widget resources but has no public call for a widget's own tool calls.
  readonly capabilities = { ...nativeCapabilities, readOnlyCommands: process.platform !== "win32", subagentDetails: true, subagentModel: true, promptSuggestions: true, contextUsage: true, compaction: true,
    mcpApps: { toolCalls: false } };
  private readonly active = new Map<string, ClaudeActive>();
  /** Each conversation's open process, kept between turns while it has background work. */
  private readonly live = new Map<string, ClaudeLive>();
  /** The run reading each conversation's current turn, which answers that turn's approvals and questions. */
  private readonly attached = new Map<string, ClaudeActive>();
  private readonly attachWaiters = new Map<string, (() => void)[]>();
  private readonly followUpListeners = new Set<FollowUpListener>();
  readonly followUps: ProviderFollowUpSource = {
    subscribe: (listener) => { this.followUpListeners.add(listener); return () => { this.followUpListeners.delete(listener); }; }
  };
  private readonly backgroundTaskListeners = new Set<BackgroundTasksListener>();
  readonly backgroundTasks: ProviderBackgroundTasksSource = {
    subscribe: (listener) => { this.backgroundTaskListeners.add(listener); return () => { this.backgroundTaskListeners.delete(listener); }; }
  };
  private readonly requests = new Map<string, ClaudePending>();
  /** The servers each conversation's latest run added, so its widgets reach the same servers until the app restarts. */
  private readonly runServers = new Map<string, readonly RunMcpServer[]>();
  constructor(private readonly options: ClaudeOptions) { this.instanceId = options.instanceId; }

  async mcp(workspace: WorkspaceRef | null, action: McpAction): Promise<McpResult> {
    return this.options.mcp ? this.options.mcp(workspace?.path ?? null, action)
      : { kind: "unavailable", message: "This Claude runtime does not expose MCP discovery." };
  }

  /** Claude rescans skill folders on every read, so a refresh needs no separate request. */
  async skills(workspace: WorkspaceRef): Promise<SkillsResult> {
    return this.options.skills ? this.options.skills(workspace.path)
      : { kind: "unavailable", message: "This Claude runtime does not expose skill discovery." };
  }

  async account(action: ProviderAccountAction): Promise<ProviderAccountResult> {
    return this.options.account ? this.options.account(action)
      : { kind: "unavailable", message: "This Claude runtime does not expose its account." };
  }

  async mcpApp(conversation: Conversation, action: ProviderMcpAppAction): Promise<ProviderMcpAppResult> {
    if (action.kind === "call-tool") return { kind: "unavailable", message: "Claude can't run tool calls from widgets yet." };
    if (!this.options.readMcpAppResource) return { kind: "unavailable", message: "This Claude runtime can't show MCP widgets." };
    try {
      const resource = await this.options.readMcpAppResource(conversation.workspace.path, this.runServers.get(conversation.id) ?? [], action.server, action.uri);
      return resource ? { kind: "resource", resource } : { kind: "unavailable", message: `${action.server} did not return a widget for this tool.` };
    } catch {
      return { kind: "unavailable", message: "Claude could not load this widget. Update Claude Code, check the MCP server is connected, then try again." };
    }
  }

  async readContext(conversation: Conversation): Promise<ContextReading | null> {
    return this.options.readContext ? this.options.readContext(conversation) : null;
  }

  async catalog(workspace: WorkspaceRef): Promise<ProviderCatalogResult> {
    try {
      const discovery = await this.options.discover(workspace.path);
      return { status: "available", catalog: { kind: this.kind, instanceId: this.instanceId,
        capabilities: this.capabilities, ...discovery,
        policies: Object.entries(this.options.policies).filter(([, mode]) => mode !== "bypassPermissions").map(([id, mode]) => claudePermissionPolicy(id, mode)) } };
    } catch {
      return { status: "unavailable", failure: { code: "provider", message: "Claude model discovery is unavailable; check the configured runtime and authentication", retryable: true } };
    }
  }

  async start(execution: ProviderExecution, emit: EmitProviderUpdate, canStart?: () => boolean): Promise<void> {
    const { snapshot, run } = execution;
    if (run.action === "background-task") { await this.startFollowUp(execution, emit); return; }
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
    const autoCompactTokens = this.options.autoCompactTokens?.();
    const runContext = await optionalRunContext(this.options.runContext, snapshot.conversation);
    const guidance = joinGuidance(conversationGuidance(snapshot.conversation), runContext.guidance);
    // Reserve the SDK-supported caller-supplied session ID durably before spawning.
    const toolScope = threadToolScope(snapshot.conversation);
    const mcpServers = isReadOnlyToolScope(toolScope)
      ? snapshot.conversation.source?.kind === "workflow" ? workflowReviewMcpServers(runContext) : []
      : runMcpServers(runContext);
    this.runServers.set(snapshot.conversation.id, mcpServers);
    const accountExtras = threadLoadsAccountExtras(snapshot.conversation);
    // Agent threads (bots/chats/write workers) may reconnect only the account connectors the bot named; other scopes do not.
    const accountConnectorNames = toolScope === "agent" ? runContext.accountConnectors ?? [] : [];
    const accountConnectors = accountConnectorNames.length && this.options.accountConnectors
      ? await this.options.accountConnectors.resolve(snapshot.conversation.workspace.path, accountConnectorNames) : {};
    if (canStart && !canStart()) {
      emit({ ...base, eventId: "cancelled-before-start", kind: "finished", status: "interrupted", usage: null, failure: null });
      return;
    }
    emit({ ...base, eventId: "native-binding", kind: "bound", nativeConversationId: sessionId });
    const turnInput = { nativeTurnId, instruction: run.action === "compact" ? CLAUDE_COMPACT_COMMAND : instructionWithTurnNotes(run.instruction, runContext),
      model: snapshot.conversation.provider.model, permissionMode: toolScope === "inspect" ? "plan" as const : toolScope === "read-worker" ? "default" as const : mode };
    const fixed = { cwd: snapshot.conversation.workspace.path, ...(guidance ? { guidance } : {}), mcpServers, toolScope, accountExtras, accountConnectors,
      promptSuggestions: !isBotOrChatThread(snapshot.conversation) && (this.options.promptSuggestions?.() ?? true),
      ...(snapshot.conversation.provider.subagentModel ? { subagentModel: snapshot.conversation.provider.subagentModel } : {}),
      ...(autoCompactTokens ? { autoCompactTokens } : {}), effort: effort.data };
    const conversationId = snapshot.conversation.id;
    const key = JSON.stringify(fixed);
    const existing = this.live.get(conversationId);
    if (existing && existing.session.isLive() && existing.sessionId === sessionId && existing.key === key) {
      await this.runTurn(execution, emit, existing, existing.session.send(turnInput), nativeTurnId);
      return;
    }
    if (existing) await this.retire(conversationId, existing, () => emit({ ...base, eventId: "background-work-stopped", kind: "item",
      item: { kind: "milestone", id: JSON.stringify([run.id, "background-work-stopped"]), runId: run.id, createdAt: this.options.now(),
        text: "Background work from an earlier turn was stopped because this thread's settings changed." } }));
    const followUps = new Map<string, ClaudeTurn>();
    const session = this.options.open({ ...fixed, ...turnInput, sessionId, resume: !!snapshot.conversation.nativeConversationId,
      onRequest: (prompt) => this.routeRequest(conversationId, prompt),
      onFollowUp: (turn, summary) => this.announceFollowUp(conversationId, live, turn, summary),
      onBackgroundTasksChanged: (tasks) => this.announceBackgroundTasks(conversationId, tasks) });
    const live: ClaudeLive = { session, sessionId, key, followUps };
    this.live.set(conversationId, live);
    await this.runTurn(execution, emit, live, session.opening, nativeTurnId);
  }

  /** Attaches a `background-task` run to the turn Claude started by itself; the run was queued when that turn began. */
  private async startFollowUp(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    const { snapshot, run } = execution;
    const live = this.live.get(snapshot.conversation.id);
    const turn = live?.followUps.get(run.id);
    if (!live || !turn) {
      emit({ conversationId: snapshot.conversation.id, runId: run.id, attemptId: run.attemptId, eventId: "follow-up-unavailable", kind: "finished",
        status: "failed", usage: null, failure: { code: "provider", message: "Claude's report on its background work is no longer available. Ask Claude for the result.", retryable: false } });
      return;
    }
    live.followUps.delete(run.id);
    await this.runTurn(execution, emit, live, turn, run.id);
  }

  /** Delivers one turn's frames as this run's updates. A turn cut off without a result closes its process. */
  private async runTurn(execution: ProviderExecution, emit: EmitProviderUpdate, live: ClaudeLive, turn: ClaudeTurn, nativeTurnId: string): Promise<void> {
    const { snapshot, run } = execution;
    const base = { conversationId: snapshot.conversation.id, runId: run.id, attemptId: run.attemptId };
    const active: ClaudeActive = { ...execution, emit, session: live.session, turn, settled: false };
    this.active.set(run.attemptId, active);
    this.attached.set(snapshot.conversation.id, active);
    for (const resolve of this.attachWaiters.get(snapshot.conversation.id)?.splice(0) ?? []) resolve();
    const tools = new Map<string, ToolActivity | SubagentActivity>();
    const timestamps = new Map(snapshot.items.map((item) => [item.id, item.createdAt]));
    const itemTime = (nativeId: string, kind: string): string => {
      const id = JSON.stringify([run.id, nativeId, kind]);
      const at = timestamps.get(id) ?? this.options.now();
      timestamps.set(id, at);
      return at;
    };
    let started = false;
    // A turn on a reused process may arrive without its own init frame, so the first frame of any kind starts the run.
    const markStarted = (eventId: string): void => {
      if (started) return;
      started = true;
      emit({ ...base, eventId, kind: "started", nativeConversationId: live.sessionId, nativeTurnId });
    };
    try {
      for await (const frame of turn) {
        if (frame.kind === "init" && frame.sessionId !== live.sessionId) throw new Error("Claude session identity changed");
        if (frame.kind !== "prompt-suggestion") markStarted(frame.kind === "init" ? frame.eventId : `started:${nativeTurnId}`);
        switch (frame.kind) {
          case "prompt-suggestion":
            if (active.settled) emit({ ...base, eventId: frame.eventId, kind: "prompt-suggestion", suggestion: frame.suggestion });
            break;
          case "init": break;
          case "text":
          case "reasoning":
            emit({ ...base, eventId: frame.eventId, kind: "item", item: frame.kind === "text"
              ? { kind: "message", role: "assistant", id: JSON.stringify([run.id, frame.nativeId, "text"]), runId: run.id,
                createdAt: itemTime(frame.nativeId, "text"), text: frame.text, complete: frame.complete }
              : { kind: "reasoning", id: JSON.stringify([run.id, frame.nativeId, "reasoning"]), runId: run.id,
                createdAt: itemTime(frame.nativeId, "reasoning"), text: frame.text, complete: frame.complete } }); break;
          case "tool": {
            const item: ToolActivity = { kind: "tool", id: JSON.stringify([run.id, frame.nativeId, "tool"]), runId: run.id,
              createdAt: itemTime(frame.nativeId, "tool"), label: frame.label, output: frame.output, state: frame.state,
              ...(frame.details ? { details: frame.details } : {}) };
            tools.set(item.id, item);
            emit({ ...base, eventId: frame.eventId, kind: "item", item }); break;
          }
          case "subagent": {
            const { kind, eventId, ...fields } = frame;
            const item: SubagentActivity = { ...fields, kind, id: JSON.stringify([run.id, frame.nativeId, "subagent"]), runId: run.id,
              createdAt: itemTime(frame.nativeId, "subagent") };
            tools.set(item.id, item);
            emit({ ...base, eventId, kind: "item", item }); break;
          }
          case "context":
            emit({ ...base, eventId: frame.eventId, kind: "context",
              context: frame.context ? { ...frame.context, updatedAt: this.options.now() } : null }); break;
          case "finished":
            active.settled = true;
            emit({ ...base, eventId: frame.eventId, kind: "finished", status: frame.status, failure: frame.failure, usage: frame.usage }); break;
        }
      }
      if (!active.settled) throw new Error("Claude stream ended without a result");
    } finally {
      if (!active.settled) for (const item of tools.values()) {
        if (item.state === "running") emit({ ...base, eventId: `unconfirmed:${item.id}`, kind: "item", item: { ...item, state: "unconfirmed" } });
      }
      this.active.delete(run.attemptId);
      if (this.attached.get(snapshot.conversation.id) === active) this.attached.delete(snapshot.conversation.id);
      for (const [id, pending] of this.requests) {
        if (pending.attemptId === run.attemptId) { pending.reject(new Error("Claude request expired")); this.requests.delete(id); }
      }
      turn.close();
      if (!active.settled) await this.retire(snapshot.conversation.id, live);
    }
  }

  /** Closes a conversation's process; `onStoppedWork` runs first when that stops background work still in flight. */
  private async retire(conversationId: string, live: ClaudeLive, onStoppedWork?: () => void): Promise<void> {
    if (this.live.get(conversationId) === live) this.live.delete(conversationId);
    if (live.session.isLive() && live.session.hasBackgroundWork()) onStoppedWork?.();
    for (const turn of live.followUps.values()) turn.close();
    live.followUps.clear();
    await live.session.close();
    this.announceBackgroundTasks(conversationId, []);
  }

  /** Hands a turn Claude started by itself to the host, which queues a run for it; a refused turn is dropped. */
  private announceFollowUp(conversationId: string, live: ClaudeLive, turn: ClaudeTurn, summary: string): void {
    const followUpId = this.options.nextId();
    live.followUps.set(followUpId, turn);
    let accepted = false;
    for (const listener of this.followUpListeners) {
      accepted = listener({ conversationId, provider: { kind: this.kind, instanceId: this.instanceId }, nativeConversationId: live.sessionId,
        followUpId, summary }) || accepted;
    }
    if (!accepted) { live.followUps.delete(followUpId); turn.close(); }
  }

  private announceBackgroundTasks(conversationId: string, tasks: readonly BackgroundTask[]): void {
    const update = { conversationId, tasks: [...tasks] };
    for (const listener of this.backgroundTaskListeners) listener(update);
  }

  /**
   * Sends an approval or question to the run reading the session's current turn. A turn Claude started by itself may ask
   * before its run attaches, so it waits briefly for that; with no run to answer, the request is declined.
   */
  private async routeRequest(conversationId: string, prompt: ClaudePrompt): Promise<RequestResponse> {
    let active = this.attached.get(conversationId);
    if (!active && this.live.get(conversationId)?.followUps.size) {
      await new Promise<void>((resolve) => {
        const waiters = this.attachWaiters.get(conversationId) ?? [];
        this.attachWaiters.set(conversationId, waiters);
        const timer = setTimeout(() => { waiters.splice(waiters.indexOf(done), 1); resolve(); }, FOLLOW_UP_ATTACH_MS);
        timer.unref();
        const done = (): void => { clearTimeout(timer); resolve(); };
        waiters.push(done);
      });
      active = this.attached.get(conversationId);
    }
    if (!active) return { kind: "approval", optionId: "deny" };
    return this.ask(active, prompt, active.emit);
  }

  private ask(execution: ProviderExecution, prompt: ClaudePrompt, emit: EmitProviderUpdate): Promise<RequestResponse> {
    const { run, snapshot } = execution;
    const id = JSON.stringify([run.id, prompt.nativeId]);
    const common = { id, runId: run.id, attemptId: run.attemptId, nativeId: prompt.nativeId, title: prompt.title,
      status: "pending" as const, createdAt: this.options.now(), expiresAt: new Date(Date.parse(this.options.now()) + (this.options.requestLifetimeMs ?? 30 * 60_000)).toISOString() };
    const request: RuntimeRequest = prompt.kind === "question" ? { ...common, kind: "question", questions: prompt.questions }
      : { ...common, kind: "approval", ...(prompt.details ? { details: prompt.details } : {}), options: this.approvalOptions(prompt.permissionMode) };
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

  private approvalOptions(mode: PermissionMode): Extract<RuntimeRequest, { kind: "approval" }>["options"] {
    const auto = claudeAutoSwitchPolicy(this.options.policies, mode);
    return [{ id: "allow", label: "Allow once", intent: "allow", scope: "once", description: "Allow only this action." },
      ...(auto ? [{ id: CLAUDE_ALLOW_AND_AUTO, label: "Allow and switch to Auto", intent: "allow" as const, switchesPolicy: auto,
        description: "Allow this action and let Claude review later actions automatically for the rest of this thread." }] : []),
      { id: "deny", label: "Decline", intent: "deny", description: "Decline this action; the agent may continue." }];
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
  async forceInterrupt(execution: ProviderExecution): Promise<void> {
    const conversationId = execution.snapshot.conversation.id;
    const live = this.live.get(conversationId);
    if (live) await this.retire(conversationId, live);
    else await this.active.get(execution.run.attemptId)?.session.close();
  }
  async reconcile(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    // SDK history is not an authoritative live-turn/approval lookup. Never resume by resending.
    emit({ kind: "disconnected", eventId: `reconcile:${this.options.nextId()}`, conversationId: execution.snapshot.conversation.id,
      runId: execution.run.id, attemptId: execution.run.attemptId,
      failure: { code: "uncertain", message: "Claude native turn status cannot be confirmed after owner loss; automatic resubmission is disabled", retryable: false } });
  }
  async close(): Promise<void> {
    const sessions = new Set([...this.active.values()].map((active) => active.session));
    await Promise.all([...this.live].map(([conversationId, live]) => this.retire(conversationId, live)));
    await Promise.all([...sessions].map((session) => session.close()));
  }
}
