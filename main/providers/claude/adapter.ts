import { isReadOnlyToolScope, threadLoadsAccountExtras, threadToolScope } from "@main/execution/toolScope";
import { isBotOrChatThread } from "@shared/conversations/accountExtras";
import { instructionWithTurnNotes, joinGuidance, optionalRunContext, runMcpServers, workflowReviewMcpServers } from "@main/nora-tools/endpoint";
import { conversationGuidance } from "@shared/conversations/guidance";
import type { McpAction, McpResult } from "@shared/types/provider/mcp.types";
import type { SkillsResult } from "@shared/types/provider/skills.types";
import type { ProviderAccountAction, ProviderAccountResult } from "@shared/types/provider/account.types";
import type { ExecutionProvider, EmitProviderUpdate, ProviderExecution } from "@main/types/execution/provider.types";
import type { ClaudeActive, ClaudeOptions, ClaudePending, ClaudePrompt } from "@main/types/execution/claude.types";
import type { ContextReading, Conversation, RequestResponse, RuntimeRequest, SubagentActivity, ToolActivity, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { z } from "zod";
import type { PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import { CLAUDE_ALLOW_AND_AUTO, claudeAutoSwitchPolicy, claudePermissionPolicy } from "./permissionPolicies";
import type { ProviderMcpAppAction, ProviderMcpAppResult } from "@main/types/execution/mcpApp.types";
import type { RunMcpServer } from "@main/types/nora-tools/noraTools.types";

/** Claude Code's slash command, which the SDK runs instead of sending the text to the model. */
const CLAUDE_COMPACT_COMMAND = "/compact";

export class ClaudeAdapter implements ExecutionProvider {
  readonly kind = "claude";
  get externalSessions() { return this.options.externalSessions; }
  readonly instanceId: string;
  // The SDK reads widget resources but has no public call for a widget's own tool calls.
  readonly capabilities = { ...nativeCapabilities, readOnlyCommands: process.platform !== "win32", subagentDetails: true, subagentModel: true, promptSuggestions: true, contextUsage: true, compaction: true,
    mcpApps: { toolCalls: false } };
  private readonly active = new Map<string, ClaudeActive>();
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

  async start(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void> {
    const { snapshot, run } = execution;
    // A new instruction supersedes a previous turn's optional prediction work.
    for (const previous of this.active.values()) {
      if (previous.settled && previous.snapshot.conversation.id === snapshot.conversation.id) await previous.session.close();
    }
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
    // Only a working thread can call MCP tools at all, so a scoped one is never handed account connectors.
    const accountConnectorNames = !accountExtras && toolScope === "full" ? runContext.accountConnectors ?? [] : [];
    const accountConnectors = accountConnectorNames.length && this.options.accountConnectors
      ? await this.options.accountConnectors.resolve(snapshot.conversation.workspace.path, accountConnectorNames) : {};
    emit({ ...base, eventId: "native-binding", kind: "bound", nativeConversationId: sessionId });
    const session = this.options.open({ sessionId, resume: !!snapshot.conversation.nativeConversationId,
      ...(autoCompactTokens ? { autoCompactTokens } : {}),
      nativeTurnId, instruction: run.action === "compact" ? CLAUDE_COMPACT_COMMAND : instructionWithTurnNotes(run.instruction, runContext), cwd: snapshot.conversation.workspace.path,
      ...(guidance ? { guidance } : {}), mcpServers,
      model: snapshot.conversation.provider.model, permissionMode: toolScope === "inspect" ? "plan" : toolScope === "read-worker" ? "default" : mode, toolScope,
      accountExtras, accountConnectors,
      promptSuggestions: !isBotOrChatThread(snapshot.conversation) && (this.options.promptSuggestions?.() ?? true),
      ...(snapshot.conversation.provider.subagentModel ? { subagentModel: snapshot.conversation.provider.subagentModel } : {}),
      effort: effort.data,
      onRequest: (prompt) => this.ask(execution, prompt, emit) });
    const active: ClaudeActive = { ...execution, emit, session, settled: false };
    this.active.set(run.attemptId, active);
    const tools = new Map<string, ToolActivity | SubagentActivity>();
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
          case "prompt-suggestion":
            if (active.settled) emit({ ...base, eventId: frame.eventId, kind: "prompt-suggestion", suggestion: frame.suggestion });
            break;
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
