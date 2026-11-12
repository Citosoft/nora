import type { ExternalSessionReader } from "./externalSessions.types";
import type { ProviderAccountAction, ProviderAccountResult } from "@shared/types/provider/account.types";
import type { McpAction, McpResult } from "@shared/types/provider/mcp.types";
import type { SkillsResult } from "@shared/types/provider/skills.types";
import type { EffortLevel, PermissionMode, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { randomUUID } from "node:crypto";
import type { ApprovalDetails, ContextReading, Conversation, ExecutionFailure, ExecutionUsage, RequestResponse, RuntimeRequest, ToolDetails, ToolState } from "@shared/types/conversation/contracts.types";
import type { EmitProviderUpdate, ProviderExecution } from "./provider.types";
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
  | { kind: "approval"; nativeId: string; title: string; details?: ApprovalDetails; signal: AbortSignal }
  | { kind: "question"; nativeId: string; title: string; questions: Extract<RuntimeRequest, { kind: "question" }>["questions"]; signal: AbortSignal };
export interface ClaudeSession extends AsyncIterable<ClaudeFrame> {
  interrupt(): Promise<void>;
  close(): void | Promise<void>;
}
export interface ClaudeMessageStream extends AsyncIterable<SDKMessage> { close(): void; }
export interface ClaudeOpenInput {
  sessionId: string;
  resume: boolean;
  instruction: string;
  guidance?: string;
  nativeTurnId: ReturnType<typeof randomUUID>;
  cwd: string;
  model: string;
  permissionMode: PermissionMode;
  effort: EffortLevel | null;
  /** Default model for subagents; per-agent definitions and explicit Agent call models still take precedence. */
  subagentModel?: string;
  onRequest: (prompt: ClaudePrompt) => Promise<RequestResponse>;
}
export interface ClaudeOptions {
  externalSessions?: ExternalSessionReader;
  instanceId: string;
  policies: Readonly<Record<string, PermissionMode>>;
  open: (input: ClaudeOpenInput) => ClaudeSession;
  mcp?: (cwd: string | null, action: McpAction) => Promise<McpResult>;
  skills?: (cwd: string) => Promise<SkillsResult>;
  account?: (action: ProviderAccountAction) => Promise<ProviderAccountResult>;
  discover: (cwd: string) => Promise<ClaudeDiscovery>;
  readContext?: (conversation: Conversation) => Promise<ContextReading | null>;
  now: () => string;
  nextId: () => ReturnType<typeof randomUUID>;
  requestLifetimeMs?: number;
}
export interface ClaudeActive extends ProviderExecution {
  session: ClaudeSession;
  emit: EmitProviderUpdate;
  settled: boolean;
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
export interface ClaudeDiscovery {
  models: ProviderModel[];
  authentication: ProviderCatalog["authentication"];
}

/** The token counts Claude reports for one model request (`message.usage`). */
export interface ClaudeRequestUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export type ClaudeToolFrame = Extract<ClaudeFrame, { kind: "tool" }>;
export type ClaudeSubagentFrame = Extract<ClaudeFrame, { kind: "subagent" }>;

/** The credential Claude Code authenticates with, as derived from the SDK account report. */
export type ClaudeLogin = "claude.ai" | "api-key" | "token" | "third-party" | "none" | "unknown";

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
