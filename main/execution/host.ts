import type { ExternalSessionsResult } from "@shared/types/conversation/externalSessions.types";
import { discoverExternalSessions, readExternalTranscript } from "./externalSessions";
import type { CommandReceipt, ContextUsage, Conversation, ConversationCommand, ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationEventPage, ConversationHeader, ConversationHistoryPage, ConversationSummary, HistoryQuery, HostShutdownResult } from "@shared/types/conversation/queries.types";
import type { McpRequest, McpResult } from "@shared/types/provider/mcp.types";
import type { SkillsRequest, SkillsResult } from "@shared/types/provider/skills.types";
import type { ProviderAccountRequest, ProviderAccountResult } from "@shared/types/provider/account.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { HostDependencies, HostLifecycle, WorkerGroup } from "@main/types/execution/host.types";
import type { ExecutionProvider } from "@main/types/execution/provider.types";
import type { EventSubscription } from "@main/types/execution/engine.types";
import { ConversationEngine } from "./engine";
import { EffectWorker } from "./effectWorker";
import { ExecutionOwnership } from "./ownership";
import { ExecutionCommandError } from "./errors";
import { conversationCommandSchema } from "@shared/conversations/contracts";
import { ConversationNaming } from "./conversationNaming";
import { isActiveRun } from "./projection";

/** The environment owner, independent of Electron windows, views and SSH connections. */
export class ExecutionHost {
  private readonly ownership: ExecutionOwnership;
  private readonly engine: ConversationEngine;
  private readonly worker: EffectWorker;
  private readonly groups: WorkerGroup[] = [
    { kinds: ["start"], controls: false, operations: new Set() },
    { kinds: ["reconcile"], controls: false, operations: new Set() },
    { kinds: ["review"], controls: false, operations: new Set() },
    { kinds: ["interrupt", "respond", "steer"], controls: true, operations: new Set() }
  ];
  private lifecycle: HostLifecycle = "idle";
  private scheduled = false;
  private unsubscribe = (): void => {};
  private shutdownPromise: Promise<HostShutdownResult> | null = null;
  private readonly concurrency: number;
  private readonly naming: ConversationNaming | null;
  private readonly contextReads = new Map<string, Promise<ContextUsage | null>>();

  constructor(private readonly deps: HostDependencies) {
    this.concurrency = deps.effectConcurrency ?? 8;
    if (!Number.isSafeInteger(this.concurrency) || this.concurrency < 1) throw new Error("Effect concurrency must be a positive integer");
    this.ownership = new ExecutionOwnership({ store: deps.store, owner: deps.owner, isProcessAlive: deps.isProcessAlive });
    this.engine = new ConversationEngine({ store: deps.store, now: deps.now, nextId: deps.nextId,
      assertOwnership: () => this.ownership.assertCurrent() });
    this.naming = deps.generateThreadName ? new ConversationNaming({ generate: deps.generateThreadName,
      apply: (id, expected, title) => { if (this.lifecycle === "running") this.engine.applyGeneratedTitle(id, expected, title); } }) : null;
    this.worker = new EffectWorker(this.engine, deps.providers, (update) => {
      if (this.lifecycle !== "running" && this.lifecycle !== "stopping") return;
      try { this.engine.accept(update); } catch { this.fault(); }
    }, deps.workspaces.verify.bind(deps.workspaces), deps.reviewer, deps.checkpoints);
  }

  start(): void {
    if (this.lifecycle === "running") return;
    if (this.lifecycle !== "idle") throw new ExecutionCommandError("conflict", "Execution host cannot restart after shutdown");
    this.ownership.acquire();
    try {
      this.engine.recover();
      this.lifecycle = "running";
      this.unsubscribe = this.engine.subscribe({ after: this.deps.store.cursor(), onEvent: () => this.schedule(), onError: () => this.fault() });
      this.schedule();
    } catch (error) { this.ownership.release(); throw error; }
  }

  async execute(input: ConversationCommand): Promise<CommandReceipt> {
    if (this.lifecycle !== "running") throw new ExecutionCommandError("conflict", "Execution host is not accepting instructions");
    const command = conversationCommandSchema.parse(input);
    const previous = this.engine.receipt(command);
    if (previous) return previous;
    if (command.kind === "steer-queued") {
      const conversation = this.deps.store.header(command.conversationId)?.conversation;
      if (!conversation) throw new ExecutionCommandError("missing", "Conversation does not exist");
      const provider = this.deps.providers.resolve(conversation.provider.kind, conversation.provider.instanceId);
      const catalog = await provider.catalog(conversation.workspace);
      if (catalog.status !== "available" || !catalog.catalog.capabilities.steering || !provider.steer) {
        throw new ExecutionCommandError("invalid", "The configured runtime does not support steering");
      }
    }
    const workspace = command.kind === "create" ? await this.deps.workspaces.prepare(command.workspace) : undefined;
    if (this.lifecycle !== "running") throw new ExecutionCommandError("conflict", "Execution host is not accepting instructions");
    if (command.kind === "create") this.deps.providers.resolve(command.provider.kind, command.provider.instanceId);
    const role = command.kind === "create" ? command.role ?? this.deps.roleForWorkspace?.(command.workspace.projectId) : undefined;
    const previousRuns = command.kind === "submit" && this.naming
      ? this.deps.store.history({ conversationId: command.conversationId, scope: "runs", limit: 1 }) : null;
    const firstInstruction = previousRuns?.scope === "runs" && previousRuns.runs.length === 0;
    const externalTranscript = command.kind === "create" && command.externalSessionId && workspace
      ? await readExternalTranscript(this.deps.providers.resolve(command.provider.kind, command.provider.instanceId), workspace, command.externalSessionId) : undefined;
    if (this.lifecycle !== "running") throw new ExecutionCommandError("conflict", "Execution host is not accepting instructions");
    const receipt = this.engine.execute(command, workspace, role, externalTranscript);
    if (firstInstruction && command.kind === "submit") {
      const conversation = this.deps.store.header(command.conversationId)?.conversation;
      if (conversation) this.naming?.start(command.conversationId, conversation.title, command.instruction);
    }
    this.schedule();
    return receipt;
  }
  header(conversationId: string): ConversationHeader | null { return this.deps.store.header(conversationId); }
  get environmentId(): string { return this.deps.store.environmentId; }
  eventCursor(): number { return this.deps.store.cursor(); }
  conversationHistory(query: HistoryQuery): ConversationHistoryPage { return this.deps.store.history(query); }
  summaries(projectId?: string): ConversationSummary[] {
    return this.deps.store.summaries(projectId);
  }
  history(conversationId: string | undefined, after: number, limit = 100): ConversationEventPage {
    if (!Number.isSafeInteger(after) || after < 0 || after > this.deps.store.cursor()) throw new ExecutionCommandError("cursor", "Hydrate a new snapshot before replay");
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new ExecutionCommandError("invalid", "History page size must be between 1 and 200");
    const events = this.deps.store.events(after, limit, conversationId);
    return { schemaVersion: 1, after, nextCursor: events.at(-1)?.cursor ?? after, events };
  }
  subscribe(input: EventSubscription): () => void { return this.engine.subscribe(input); }
  /** Measures a thread once when it has no reading; concurrent views share one native read. */
  async context(conversationId: string): Promise<ContextUsage | null> {
    if (this.lifecycle !== "running") throw new ExecutionCommandError("conflict", "Execution host is not running");
    const conversation = this.deps.store.header(conversationId)?.conversation;
    if (!conversation) throw new ExecutionCommandError("missing", "Conversation does not exist");
    if (conversation.context !== undefined) return conversation.context;
    if (!conversation.nativeConversationId) return null;
    const pending = this.contextReads.get(conversationId);
    if (pending) return pending;
    const read = this.measureContext(conversation).finally(() => { this.contextReads.delete(conversationId); });
    this.contextReads.set(conversationId, read);
    return read;
  }
  private async measureContext(conversation: Conversation): Promise<ContextUsage | null> {
    const provider = this.deps.providers.resolve(conversation.provider.kind, conversation.provider.instanceId);
    // Saved history is best effort: an unreadable session simply has no reading until its next turn.
    const reading = provider.capabilities.contextUsage && provider.readContext ? await provider.readContext(conversation).catch(() => null) : null;
    return reading ? this.engine.recordContext(conversation.id, reading) : null;
  }

  async catalog(kind: ProviderBinding["kind"], instanceId: string, selection: WorkspaceRef): Promise<ProviderCatalogResult> {
    const workspace = await this.deps.workspaces.prepare(selection);
    if (this.lifecycle !== "running" || workspace.environmentId !== this.deps.store.environmentId) {
      throw new ExecutionCommandError("environment", "Provider discovery must run on the owning execution host");
    }
    return this.deps.providers.resolve(kind, instanceId).catalog(workspace);
  }

  async externalSessions(kind: ProviderBinding["kind"], instanceId: string, selection: WorkspaceRef): Promise<ExternalSessionsResult> {
    const workspace = await this.deps.workspaces.prepare(selection);
    if (this.lifecycle !== "running") throw new ExecutionCommandError("conflict", "Execution host is not running");
    const provider = this.deps.providers.resolve(kind, instanceId);
    return discoverExternalSessions(provider, workspace, () => this.deps.store.summaries());
  }

  async mcp(request: McpRequest): Promise<McpResult> {
    const workspace = request.workspace ? await this.deps.workspaces.prepare(request.workspace) : null;
    if (this.lifecycle !== "running" || (workspace?.environmentId ?? request.environmentId) !== this.environmentId) {
      throw new ExecutionCommandError("environment", "MCP discovery must run on the owning execution host");
    }
    const provider = this.deps.providers.resolve(request.providerKind, request.instanceId);
    if (!provider.mcp) return { kind: "unavailable", message: "This runtime does not expose MCP connections." };
    const result = await provider.mcp(workspace, request.action);
    // Without a workspace, runtimes resolve from a neutral directory; never present its project config as global.
    return workspace || result.kind !== "servers" ? result
      : { ...result, servers: result.servers.filter((server) => server.scope !== "workspace") };
  }

  async skills(request: SkillsRequest): Promise<SkillsResult> {
    const workspace = await this.deps.workspaces.prepare(request.workspace);
    if (this.lifecycle !== "running" || workspace.environmentId !== this.environmentId) {
      throw new ExecutionCommandError("environment", "Skill discovery must run on the owning execution host");
    }
    const provider = this.deps.providers.resolve(request.providerKind, request.instanceId);
    return provider.skills ? provider.skills(workspace, request.refresh)
      : { kind: "unavailable", message: "This runtime does not report its skills." };
  }

  /** Adds a runtime installed after startup; existing conversations keep the provider they were bound to. */
  adoptProvider(provider: ExecutionProvider): boolean {
    if (this.lifecycle !== "running") return false;
    return this.deps.providers.adopt(provider);
  }

  async account(request: ProviderAccountRequest): Promise<ProviderAccountResult> {
    if (this.lifecycle !== "running" || request.environmentId !== this.environmentId) {
      throw new ExecutionCommandError("environment", "Provider accounts must be read on the owning execution host");
    }
    const provider = this.deps.providers.resolve(request.providerKind, request.instanceId);
    return provider.account ? provider.account(request.action)
      : { kind: "unavailable", message: "This runtime does not expose its account." };
  }

  private schedule(): void {
    if (this.scheduled || !["running", "stopping"].includes(this.lifecycle)) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      try {
        for (const group of this.groups) {
          if (this.lifecycle !== "running" && !(this.lifecycle === "stopping" && group.controls)) continue;
          while (group.operations.size < this.concurrency) {
            const work = this.worker.beginNextEffect(group.kinds);
            if (!work) break;
            const operation = work.catch(() => this.fault()).finally(() => {
              group.operations.delete(operation);
              this.schedule();
            });
            group.operations.add(operation);
          }
        }
      } catch { this.fault(); }
    });
  }

  private fault(): void {
    if (this.lifecycle === "faulted" || this.lifecycle === "stopped") return;
    this.lifecycle = "faulted";
    this.naming?.close();
    try { this.deps.onFailure({ code: "host", message: "Nora could not maintain durable execution state; execution has been stopped for recovery", retryable: false }); }
    catch { /* An observer cannot prevent provider shutdown. */ }
    void this.deps.providers.close().catch(() => {});
  }

  shutdown(): Promise<HostShutdownResult> {
    if (!this.shutdownPromise) this.shutdownPromise = this.stop();
    return this.shutdownPromise;
  }
  private async stop(): Promise<HostShutdownResult> {
    if (this.lifecycle === "idle") { this.lifecycle = "stopped"; this.deps.store.close(); return { unconfirmedRuns: [] }; }
    this.lifecycle = "stopping";
    this.naming?.close();
    const waitController = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<void>((resolve) => { timeout = setTimeout(resolve, this.deps.shutdownGraceMs ?? 10_000); });
    try {
      this.interruptOwnedRuns(); this.schedule();
      await Promise.race([this.waitForSettledRuns(waitController.signal), deadline]);
      await Promise.race([this.deps.providers.close().catch(() => {}), deadline]);
      await Promise.race([Promise.allSettled(this.groups.flatMap((group) => [...group.operations])), deadline]);
      this.interruptOwnedRuns();
      const unconfirmedRuns: HostShutdownResult["unconfirmedRuns"] = [];
      for (const snapshot of this.deps.store.activeStates()) {
        for (const run of snapshot.runs.filter(isActiveRun)) {
          unconfirmedRuns.push({ environmentId: this.deps.store.environmentId, conversationId: snapshot.conversation.id, runId: run.id, attemptId: run.attemptId });
          this.engine.accept({ kind: "disconnected", eventId: `shutdown:${this.deps.owner.id}`, conversationId: snapshot.conversation.id,
            runId: run.id, attemptId: run.attemptId, failure: { code: "uncertain", message: "Execution stopped without a confirmed native outcome; reconcile on restart", retryable: false } });
        }
      }
      return { unconfirmedRuns };
    } finally {
      waitController.abort();
      await Promise.race([this.deps.providers.close().catch(() => {}), deadline]);
      clearTimeout(timeout); this.unsubscribe(); this.lifecycle = "stopped";
      try { this.ownership.release(); } finally { this.deps.store.close(); }
    }
  }
  private interruptOwnedRuns(): void {
    for (const snapshot of this.deps.store.activeStates()) {
      for (const run of snapshot.runs.filter((entry) => isActiveRun(entry) && entry.state !== "recovering" && entry.state !== "stopping")) {
        this.engine.execute({ kind: "interrupt", commandId: `shutdown:${this.deps.owner.id}:${run.id}`, conversationId: snapshot.conversation.id, runId: run.id });
      }
    }
  }
  private waitForSettledRuns(signal: AbortSignal): Promise<void> {
    const settled = (): boolean => this.deps.store.activeStates().every((snapshot) => snapshot.runs.every((run) => !isActiveRun(run) || run.state === "recovering"));
    if (settled()) return Promise.resolve();
    return new Promise((resolve) => {
      const finish = (): void => { unsubscribe(); signal.removeEventListener("abort", finish); resolve(); };
      const unsubscribe = this.engine.subscribe({ after: this.deps.store.cursor(), onEvent: () => {
        if (settled()) finish();
      }, onError: finish });
      signal.addEventListener("abort", finish, { once: true });
    });
  }
}
