import type { AppIcon } from "@shared/types/apps/apps.types";
import type { UpdateAppInput } from "@main/types/apps/apps.types";
import type { AgentSettings, AgentSettingsPatch } from "@shared/types/nora-tools/settings.types";
import type { Conversation, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConnectorSubject } from "@shared/types/connectors/connectors.types";
import type { NoraToolAudience } from "@shared/types/nora-tools/noraTools.types";
import type { LoopDefinition, LoopRun, LoopRoleOutcome } from "@shared/appTypes";
import type { SecretScope, SecretSummary } from "@shared/types/secrets/secrets.types";
import type { SecretPromptOutcome, SecretRunOutcome } from "@main/types/secrets/secrets.types";
import type { BotMemoryEntry, BotAvatarEyes, BotAvatarPalette, BotAvatarShape, BotDefinition, EffectiveBot } from "@shared/types/bots/bots.types";
import type { AppDefinition, AppRenderData, AppSpecInput } from "@shared/types/apps/apps.types";
import type { JsonValue } from "@main/jsonValue";

/** Where a runtime reaches Nora's own tools for one conversation; the token identifies that conversation. */
export interface NoraToolEndpoint { url: string; token: string; }
/** Null for conversations that do not get Nora's tools (group and direct chats, which run on Nora's coordinators). */
export type NoraToolEndpointResolver = (conversation: Conversation) => Promise<NoraToolEndpoint | null>;
/**
 * A remote MCP server added to one run: Nora's own tools or a connector, both reached over loopback with a bearer token.
 * `trustedTools` run without an approval prompt; `toolTimeoutSeconds` raises the runtime's per-call limit.
 */
export interface RunMcpServer {
  name: string;
  url: string;
  token: string;
  trustedTools?: readonly string[];
  toolTimeoutSeconds?: number;
}
/** Per-run additions for a conversation: Nora's tool endpoint, connectors and guidance that changes between runs, such as a bot's saved notes. */
export interface NoraRunContext {
  tools: NoraToolEndpoint | null;
  /** Connectors added in Nora, reached through its gateway. */
  connectors: readonly RunMcpServer[];
  /** Names of the runtime account's own connectors this thread may use (a bot's choice); absent or empty means none. */
  accountConnectors?: readonly string[];
  /** Session guidance; kept stable across a thread's turns so providers can cache the conversation behind it. */
  guidance: string | null;
  /** Context for this turn only (saved-note changes), sent in front of the user's instruction. */
  turnNotes: string | null;
}
export type NoraRunContextResolver = (conversation: Conversation) => Promise<NoraRunContext>;
/** The next run's additions as separate parts, read without resolving an endpoint or freezing notes. */
export interface NoraRunContextPreview {
  tools: boolean;
  /** How many connectors the run would get. */
  connectors: number;
  toolGuidance: string | null;
  notesGuidance: string | null;
  turnNotes: string | null;
}
/** What a run-context preview reads of a thread; a thread about to be created can be described before it exists. */
export type RunContextSubject = Pick<Conversation, "id" | "bot" | "group" | "direct" | "workspace" | "source">;
export interface NoraRunContextSource {
  resolve: NoraRunContextResolver;
  preview(subject: RunContextSubject): NoraRunContextPreview;
}
/** The calling thread and which tool set it gets; `chat` is the group or direct chat a bot thread answers in. */
export interface NoraToolContext { conversation: Conversation; audience: Exclude<NoraToolAudience, "member">; chat?: Conversation; }

export interface BotModelInput { provider?: string; model?: string; }
export interface BotAvatarInput { shape?: BotAvatarShape; colour?: BotAvatarPalette; eyes?: BotAvatarEyes; }
export interface CreateBotToolInput extends BotModelInput, BotAvatarInput {
  name: string;
  role?: string;
  instructions?: string;
  availability?: "everywhere" | "workspace";
  sharing?: "private" | "shared";
}
export interface UpdateBotToolInput extends BotModelInput, BotAvatarInput {
  id: string;
  name?: string;
  role?: string;
  instructions?: string;
}
export interface NoraBotOperations {
  create(input: CreateBotToolInput, context: NoraToolContext): Promise<BotDefinition>;
  update(input: UpdateBotToolInput, context: NoraToolContext): Promise<BotDefinition>;
  list(context: NoraToolContext): EffectiveBot[];
}

export interface NoraWorkspaceInfo { id: string; name: string; kind: string; path: string; branch: string | null; current: boolean; }
export interface NoraProviderModels { readOnlyCommands: boolean; kind: string; instanceId: string; label: string; models: readonly string[]; unavailable: string | null; }
export interface NoraSettingsOperations {
  read(): Promise<AgentSettings>;
  update(patch: AgentSettingsPatch): Promise<AgentSettings>;
}

export interface NoraAppOperations {
  workspaces(context: NoraToolContext): NoraWorkspaceInfo[];
  models(context: NoraToolContext): Promise<NoraProviderModels[]>;
}

export interface NoraThreadQuery { allWorkspaces: boolean; includeSettled: boolean; limit: number; }
export interface NoraThreadInfo { id: string; title: string; workspace: string; bot: string | null; status: string; updatedAt: string; current: boolean; }
export interface NoraThreadMessage { role: "user" | "assistant"; text: string; createdAt: string; }
export interface NoraThreadTranscript { title: string; messages: readonly NoraThreadMessage[]; truncated: boolean; }
export interface NoraThreadOperations {
  list(query: NoraThreadQuery, context: NoraToolContext): NoraThreadInfo[];
  read(conversationId: string, limit: number, context: NoraToolContext): NoraThreadTranscript;
}

export interface NoraChatMessage { author: string; text: string; createdAt: string; }
export interface NoraChatHistory { title: string; messages: readonly NoraChatMessage[]; more: boolean; }
export interface NoraChatOperations {
  /** Chat messages older than the newest `skip`, newest last; only for a bot thread's own group or direct chat. */
  history(skip: number, limit: number, context: NoraToolContext): NoraChatHistory;
}

export interface NoraTaskInfo { link: string; id: string; path: string; title: string; column: string; columnId: string; completed: boolean; }
export interface NoraTaskDetail { task: NoraTaskInfo; content: string; }
export interface NoraTaskOperations {
  list(context: NoraToolContext): Promise<NoraTaskInfo[]>;
  create(title: string, details: string | undefined, context: NoraToolContext): Promise<NoraTaskInfo>;
  move(path: string, column: string, context: NoraToolContext): Promise<NoraTaskInfo>;
  read(id: string, context: NoraToolContext): Promise<NoraTaskDetail>;
  start(id: string, context: NoraToolContext): Promise<NoraTaskInfo>;
  finish(id: string, context: NoraToolContext): Promise<NoraTaskInfo>;
}

/** A workflow role as the tools describe it; `agent` is a provider kind or instance id, defaulting to the thread's provider. */
export interface WorkflowRoleToolInput { id?: string; name: string; kind: "writer" | "reviewer"; agent?: string; model?: string | null; botId?: string; reworkStageId?: string; instructions: string; }
export interface WorkflowLimitsToolInput { maxIterations?: number; maxDurationMinutes?: number; roleTimeoutMinutes?: number; }
export interface CreateWorkflowToolInput {
  name: string;
  description?: string;
  stages: readonly WorkflowRoleToolInput[];
  limits?: WorkflowLimitsToolInput;
}
export interface UpdateWorkflowToolInput {
  id: string;
  name?: string;
  description?: string;
  /** Replaces the ordered stages when present. */
  stages?: readonly WorkflowRoleToolInput[];
  limits?: WorkflowLimitsToolInput;
}
export interface RunWorkflowToolInput { id: string; objective?: string; taskId?: string; }
export type WorkflowRunControl = "pause" | "resume" | "cancel";
export interface NoraWorkflowInfo { definition: LoopDefinition; latestRun: LoopRun | null; }
export interface NoraWorkflowOperations {
  report(input: { attemptId: string; outcome: LoopRoleOutcome; summary: string }, context: NoraToolContext): Promise<void>;
  list(context: NoraToolContext): Promise<NoraWorkflowInfo[]>;
  create(input: CreateWorkflowToolInput, context: NoraToolContext): Promise<LoopDefinition>;
  update(input: UpdateWorkflowToolInput, context: NoraToolContext): Promise<LoopDefinition>;
  run(input: RunWorkflowToolInput, context: NoraToolContext): Promise<LoopRun>;
  readRun(runId: string, context: NoraToolContext): Promise<LoopRun>;
  controlRun(runId: string, action: WorkflowRunControl, context: NoraToolContext): Promise<LoopRun>;
}

/** A worker runs as a saved bot (`bot`) or on a provider and model from list_models; both default to the calling thread's. */
export interface StartWorkerToolInput extends BotModelInput { title: string; prompt: string; done?: string; bot?: string; access?: "read" | "write"; isolation?: "worktree" | "shared"; }
export interface NoraWorkerStart { workspace: WorkspaceRef; id: string; title: string; runsAs: string; access: "read" | "write"; }
/** Where a worker stands: still working, stopped on the user, paused, or finished its latest turn (or never started one: ready). */
export type NoraWorkerStatus = "running" | "needs-approval" | "needs-input" | "paused" | "completed" | "failed" | "interrupted" | "ready";
export interface NoraWorkerReport { id: string; title: string; status: NoraWorkerStatus; report: string | null; failure: string | null; }
export interface WaitForWorkersInput { ids?: readonly string[]; mode: "all" | "any"; timeoutMs: number; }
/** Worker threads a Nora thread starts and collects; every operation is scoped to the caller's own workers. */
export interface NoraWorkerOperations {
  start(input: StartWorkerToolInput, context: NoraToolContext): Promise<NoraWorkerStart>;
  message(id: string, prompt: string, context: NoraToolContext): Promise<{ id: string; title: string }>;
  wait(input: WaitForWorkersInput, context: NoraToolContext, signal: AbortSignal): Promise<NoraWorkerReport[]>;
}

export interface AskBotResult { botName: string; conversationId: string; reply: string; }
export interface NoraAskOperations {
  /** Runs the bot in its own child thread of the caller and waits for its final reply. */
  ask(bot: string, message: string, context: NoraToolContext, signal: AbortSignal): Promise<AskBotResult>;
}
/** A new note in a scope, or a correction of one of the thread's own saved notes by id. */
export type RememberInput = { kind: "add"; text: string; scope: "bot" | "workspace" } | { kind: "update"; memoryId: string; text: string };
export interface NoraMemoryOperations {
  remember(input: RememberInput, context: NoraToolContext): { note: BotMemoryEntry; updated: boolean };
  recall(query: string, context: NoraToolContext): BotMemoryEntry[];
  forget(memoryId: string, context: NoraToolContext): BotMemoryEntry;
}

export interface RequestSecretToolInput { name: string; purpose: string; scope: SecretScope; multiline: boolean; }
export interface RunWithSecretsToolInput { command: string; secrets: readonly string[]; timeoutSeconds: number; }
/** Secrets as a thread uses them: by name only. No operation returns a value. */
export interface NoraSecretOperations {
  request(input: RequestSecretToolInput, context: NoraToolContext, signal: AbortSignal): Promise<Exclude<SecretPromptOutcome["kind"], "allowed">>;
  list(context: NoraToolContext): SecretSummary[];
  /** False when no such secret was saved. */
  remove(name: string, scope: SecretScope, context: NoraToolContext): boolean;
  run(input: RunWithSecretsToolInput, context: NoraToolContext, signal: AbortSignal): Promise<SecretRunOutcome>;
}

/** App operations the tools call; each acts as the user would in Nora, scoped to the calling thread. */
/** Apps the agent builds for the user (the Apps section), as distinct from `NoraAppOperations`, which describes Nora itself. */
export interface NoraAppsOperations {
  guide(): string;
  listConnectorTools(connectorId: string | undefined, context: NoraToolContext): Promise<string>;
  sample(input: SampleAppSourceToolInput, context: NoraToolContext): Promise<JsonValue>;
  sampleFile(input: SampleAppFileToolInput, context: NoraToolContext): Promise<JsonValue>;
  create(input: CreateAppToolInput, context: NoraToolContext): Promise<AppDefinition>;
  update(input: UpdateAppToolInput, context: NoraToolContext): Promise<AppDefinition>;
  read(id: string, context: NoraToolContext): { app: AppDefinition; data: AppRenderData };
}
export interface SampleAppSourceToolInput { sourceId: string; connectorId: string; tool: string; args: Record<string, JsonValue>; }
export interface SampleAppFileToolInput { sourceId: string; path: string; }
export interface CreateAppToolInput { name: string; spec: AppSpecInput; suggestions?: readonly string[]; icon?: AppIcon; }
/** A builder thread always says which version it changed, so its saves never overwrite edits it has not seen. */
export type UpdateAppToolInput = UpdateAppInput & { baseVersion: number };

export interface NoraToolDeps {
  asks: NoraAskOperations;
  apps: NoraAppsOperations;
  memory: NoraMemoryOperations;
  secrets: NoraSecretOperations;
  context(conversationId: string): NoraToolContext | null;
  bots: NoraBotOperations;
  app: NoraAppOperations;
  settings: NoraSettingsOperations;
  threads: NoraThreadOperations;
  chats: NoraChatOperations;
  tasks: NoraTaskOperations;
  workflows: NoraWorkflowOperations;
  workers: NoraWorkerOperations;
}
/** The connectors a run receives; satisfied by the connector service. */
export interface RunContextConnectors {
  /** The connectors this thread gets: usable ones whose access admits its workspace and bot, narrowed to `only` when a thread names its own. */
  endpoints(subject: ConnectorSubject, only?: readonly string[]): Promise<RunMcpServer[]>;
  activeCount(subject: ConnectorSubject, only?: readonly string[]): number;
}
/** The runtime account connectors a thread's subject may use, read live so a bot's change applies on its next turn. */
export type RunContextAccountConnectors = (subject: ConnectorSubject) => readonly string[];
export interface NoraToolServer {
  resolve: NoraToolEndpointResolver;
  running(): boolean;
  close(): Promise<void>;
}
