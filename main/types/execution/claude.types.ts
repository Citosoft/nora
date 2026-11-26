import type { ThreadToolScope } from "./toolScope.types";
import type { NoraRunContextResolver, RunMcpServer } from "@main/types/nora-tools/noraTools.types";
import type { ExternalSessionReader } from "./externalSessions.types";
import type { ProviderAccountAction, ProviderAccountResult, ProviderLoginMethod } from "@shared/types/provider/account.types";
import type { McpAction, McpResult } from "@shared/types/provider/mcp.types";
import type { SkillsResult } from "@shared/types/provider/skills.types";
import type { EffortLevel, McpClaudeAIProxyServerConfig, McpServerStatus, Options, PermissionMode, SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { randomUUID } from "node:crypto";
import type { ApprovalDetails, ContextReading, Conversation, ExecutionFailure, ExecutionUsage, RequestResponse, RuntimeRequest, ToolDetails, ToolState } from "@shared/types/conversation/contracts.types";
import type { EmitProviderUpdate, ProviderExecution } from "./provider.types";
import type { McpAppResource, McpAppToolUi } from "./mcpApp.types";
import type { ProviderModel, ProviderCatalog } from "@shared/types/provider/catalog.types";

export type ClaudeFrame =
  | { kind: "prompt-suggestion"; eventId: string; suggestion: string }
  | { kind: "init"; eventId: string; sessionId: string }
  | { kind: "text" | "reasoning"; eventId: string; nativeId: string; text: string; complete: boolean }
  | { kind: "tool"; eventId: string; nativeId: string; label: string; output: string; state: ToolState; details?: ToolDetails }
  | { kind: "subagent"; eventId: string; nativeId: string; label: string; state: ToolState; agentType?: string; prompt?: string; progress?: string; result?: string; model?: string; effort?: string }
  | { kind: "context"; eventId: string; context: ContextReading | null }
  | { kind: "finished"; eventId: string; status: "completed" | "failed" | "interrupted"; failure: ExecutionFailure | null; usage: ExecutionUsage };
export type ClaudePrompt =
  /** `permissionMode` is the session's live mode when Claude asked, which an earlier answer may have changed. */
  | { kind: "approval"; nativeId: string; title: string; details?: ApprovalDetails; permissionMode: PermissionMode; signal: AbortSignal }
  | { kind: "question"; nativeId: string; title: string; questions: Extract<RuntimeRequest, { kind: "question" }>["questions"]; signal: AbortSignal };
/** One turn's frames. Closing it stops reading the turn; the native process carries on. */
export interface ClaudeTurn extends AsyncIterable<ClaudeFrame> {
  close(): void;
}
/** What a turn sent into a running session needs; model and permission mode are switched live when they changed. */
export interface ClaudeTurnInput {
  nativeTurnId: ReturnType<typeof randomUUID>;
  instruction: string;
  model: string;
  permissionMode: PermissionMode;
}
/**
 * One Claude Code process, kept for later turns while it has background work (shells, monitors, background agents) so
 * that work is not killed between turns. Without background work it closes on its own shortly after a turn ends.
 */
export interface ClaudeSession {
  /** The turn the session was opened with. */
  readonly opening: ClaudeTurn;
  /** Starts another turn once the current one has ended. */
  send(input: ClaudeTurnInput): ClaudeTurn;
  interrupt(): Promise<void>;
  /** Ends the process, stopping any background work. */
  close(): Promise<void>;
  /** False once the process has closed or is closing. */
  isLive(): boolean;
  /** Whether closing now would stop background work. */
  hasBackgroundWork(): boolean;
}
/** The SDK query a live session drives; narrowed so the session can be tested without the SDK. */
export interface ClaudeNativeQuery extends AsyncIterable<SDKMessage> {
  interrupt(): Promise<unknown>;
  close(): void;
  setModel(model?: string): Promise<void>;
  setPermissionMode(mode: PermissionMode): Promise<void>;
}
/** The session's prompt stream: messages pushed here reach Claude Code's input; ending it closes that input. */
export interface ClaudeInputQueue extends AsyncIterable<SDKUserMessage> {
  push(message: SDKUserMessage): void;
  end(): void;
}
export interface ClaudeLiveSessionDeps {
  native: ClaudeNativeQuery;
  input: ClaudeInputQueue;
  sessionId: string;
  opening: ClaudeTurnInput;
  /** Turns a turn's raw messages into frames (normally `readClaudeStream` with its policy and widget lookups). */
  readTurn(source: ClaudeMessageStream): AsyncIterable<ClaudeFrame>;
  /** A turn Claude started by itself, with a one-line description of what woke it. */
  onFollowUp(turn: ClaudeTurn, summary: string): void;
  /** How long an idle session without background work waits for a late suggestion or follow-up before closing. */
  idleCloseMs?: number;
}
/** The settings object a session passes as its flag-level settings (the SDK also accepts a file path, which Nora never uses). */
export type ClaudeFlagSettings = Exclude<Options["settings"], string | undefined>;
export interface ClaudeMessageStream extends AsyncIterable<SDKMessage> { close(): void; }
export interface ClaudeOpenInput {
  autoCompactTokens?: number;
  sessionId: string;
  resume: boolean;
  instruction: string;
  guidance?: string;
  nativeTurnId: ReturnType<typeof randomUUID>;
  cwd: string;
  model: string;
  permissionMode: PermissionMode;
  toolScope: ThreadToolScope;
  /** False leaves out claude.ai connectors and synced plugins and skills; see `threadLoadsAccountExtras`. */
  accountExtras: boolean;
  /** Whether the runtime predicts the user's next message after the turn. */
  promptSuggestions: boolean;
  /** claude.ai connectors added back by name when `accountExtras` is false: the ones a bot was given. */
  accountConnectors: ClaudeAccountConnectors;
  effort: EffortLevel | null;
  /** Default model for subagents; per-agent definitions and explicit Agent call models still take precedence. */
  subagentModel?: string;
  /** MCP servers this run adds: Nora's own tools when the conversation gets them, and connectors. */
  mcpServers: readonly RunMcpServer[];
  /** Approvals and questions from any turn of the session, including turns Claude starts by itself. */
  onRequest: (prompt: ClaudePrompt) => Promise<RequestResponse>;
  /** A turn Claude started by itself, typically to report background work that finished. */
  onFollowUp: (turn: ClaudeTurn, summary: string) => void;
}
/** claude.ai connectors keyed by the name the runtime lists them under, as the proxy configs that connect them explicitly. */
export type ClaudeAccountConnectors = Readonly<Record<string, McpClaudeAIProxyServerConfig>>;
/** Remembers how to reach the account's claude.ai connectors, so a run can connect only the ones it was given. */
export interface ClaudeAccountConnectorDirectory {
  /** Replaces what is known with a full listing of the runtime's MCP servers. */
  remember(servers: readonly McpServerStatus[]): void;
  /** The named connectors that exist; names it does not know trigger a fresh listing, and ones still unknown are left out. */
  resolve(cwd: string, names: readonly string[]): Promise<ClaudeAccountConnectors>;
}
export interface ClaudeOptions {
  accountConnectors?: Pick<ClaudeAccountConnectorDirectory, "resolve">;
  /** Nora's per-run additions: its tool server and run guidance such as a bot's notes. */
  runContext?: NoraRunContextResolver;
  autoCompactTokens?: () => number | null;
  /** The user's suggested-replies preference, read per turn; absent means on. */
  promptSuggestions?: () => boolean;
  externalSessions?: ExternalSessionReader;
  instanceId: string;
  policies: Readonly<Record<string, PermissionMode>>;
  open: (input: ClaudeOpenInput) => ClaudeSession;
  mcp?: (cwd: string | null, action: McpAction) => Promise<McpResult>;
  skills?: (cwd: string) => Promise<SkillsResult>;
  account?: (action: ProviderAccountAction) => Promise<ProviderAccountResult>;
  discover: (cwd: string) => Promise<ClaudeDiscovery>;
  readContext?: (conversation: Conversation) => Promise<ContextReading | null>;
  /** Reads a widget's `ui://` resource in `cwd`, with the servers the conversation's runs add. */
  readMcpAppResource?: (cwd: string, servers: readonly RunMcpServer[], server: string, uri: string) => Promise<McpAppResource | null>;
  now: () => string;
  nextId: () => ReturnType<typeof randomUUID>;
  requestLifetimeMs?: number;
}
export interface ClaudeActive extends ProviderExecution {
  session: ClaudeSession;
  turn: ClaudeTurn;
  emit: EmitProviderUpdate;
  settled: boolean;
}
/** A conversation's open Claude Code process, reused for its next turn while compatible. */
export interface ClaudeLive {
  session: ClaudeSession;
  sessionId: string;
  /** Everything a reused process cannot change mid-session; a different key needs a fresh process. */
  key: string;
  /** Turns Claude started by itself, keyed by the run ID the host gave each, waiting for that run to start. */
  followUps: Map<string, ClaudeTurn>;
}
export interface ClaudePending {
  attemptId: string;
  resolve: (response: RequestResponse) => void;
  reject: (error: Error) => void;
}
export interface ClaudeRuntimeOptions {
  executablePath: string;
  environment?: NodeJS.ProcessEnv;
  discoveryTimeoutMs?: number;
}
/** One spawned control session; `close` ends its idle input and waits for the runtime to exit. */
export interface ClaudeControlSessionHandle<Session> {
  session: Session;
  close(): Promise<void>;
}
export type ClaudeControlSessionOpener<Session> = (runtime: ClaudeRuntimeOptions, cwd: string, model: string | undefined,
  mcpServers?: readonly RunMcpServer[]) => ClaudeControlSessionHandle<Session>;
export interface ClaudeSharedControlSession<Session> extends ClaudeControlSessionHandle<Session> {
  readers: number;
}
export type ClaudeControlSessionRunner<Session> = <T>(runtime: ClaudeRuntimeOptions, cwd: string, read: (session: Session) => Promise<T>, model?: string,
  mcpServers?: readonly RunMcpServer[]) => Promise<T>;
export interface ClaudeDiscovery {
  connection?: ProviderCatalog["connection"];
  models: ProviderModel[];
  authentication: ProviderCatalog["authentication"];
}

/** The token counts Claude reports for one model request (`message.usage`). */
export interface ClaudeRequestUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation?: { ephemeral_1h_input_tokens: number; ephemeral_5m_input_tokens: number } | null;
}

export type ClaudeToolFrame = Extract<ClaudeFrame, { kind: "tool" }>;
/** A widget-bearing MCP tool, resolved from the runtime's server status. */
export interface ClaudeMcpAppTool { server: string; tool: string; ui: McpAppToolUi }
/** Resolves a Claude tool name (`mcp__<server>__<tool>`) to its widget, if its server declared one. */
export type ClaudeMcpAppLookup = (toolName: string) => ClaudeMcpAppTool | null;
export type ClaudeSubagentFrame = Extract<ClaudeFrame, { kind: "subagent" }>;

/** The credential Claude Code authenticates with, as derived from the SDK account report. */
export type ClaudeLogin = "claude.ai" | "console" | "api-key" | "token" | "third-party" | "none" | "unknown";
/** A sign-in the Claude runtime offers, with the `claude auth login` flag that selects it. */
export interface ClaudeLoginMethod extends ProviderLoginMethod { flag: "--claudeai" | "--console"; }

/** Timing for re-reading Claude MCP status until background connections settle; injectable for tests. */
/** Runs the runtime's own MCP sign-in for one server in `cwd`; resolves whether it completed. */
export type ClaudeMcpLoginRunner = (cwd: string, serverName: string) => Promise<boolean>;
export interface McpSettleOptions { budgetMs?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void>; now?: () => number; }

/** The SDK's saved-transcript reader, injectable for tests. */
export interface ClaudeTranscriptApi {
  getSessionMessages(sessionId: string, options: { dir: string }): Promise<ReadonlyArray<{ type: string; message: unknown; parent_tool_use_id: string | null; parent_agent_id: string | null }>>;
}
/** Resolves the context window Claude measures a model against. */
export type ClaudeContextWindowReader = (model: string, cwd: string) => Promise<number | null>;
