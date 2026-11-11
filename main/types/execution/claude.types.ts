import type { ProviderAccountAction, ProviderAccountResult } from "@shared/types/provider/account.types";
import type { McpResult } from "@shared/types/provider/mcp.types";
import type { EffortLevel, PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import type { randomUUID } from "node:crypto";
import type { ApprovalDetails, ExecutionFailure, ExecutionUsage, RequestResponse, RuntimeRequest, ToolDetails, ToolState } from "@shared/types/conversation/contracts.types";
import type { EmitProviderUpdate, ProviderExecution } from "./provider.types";
import type { ProviderModel, ProviderCatalog } from "@shared/types/provider/catalog.types";

export type ClaudeFrame =
  | { kind: "init"; eventId: string; sessionId: string }
  | { kind: "text" | "reasoning"; eventId: string; nativeId: string; text: string; complete: boolean }
  | { kind: "tool"; eventId: string; nativeId: string; label: string; output: string; state: ToolState; details?: ToolDetails }
  | { kind: "finished"; eventId: string; status: "completed" | "failed" | "interrupted"; failure: ExecutionFailure | null; usage: ExecutionUsage };
export type ClaudePrompt =
  | { kind: "approval"; nativeId: string; title: string; details?: ApprovalDetails; signal: AbortSignal }
  | { kind: "question"; nativeId: string; title: string; questions: Extract<RuntimeRequest, { kind: "question" }>["questions"]; signal: AbortSignal };
export interface ClaudeSession extends AsyncIterable<ClaudeFrame> {
  interrupt(): Promise<void>;
  close(): void | Promise<void>;
}
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
  onRequest: (prompt: ClaudePrompt) => Promise<RequestResponse>;
}
export interface ClaudeOptions {
  instanceId: string;
  policies: Readonly<Record<string, PermissionMode>>;
  open: (input: ClaudeOpenInput) => ClaudeSession;
  readMcp?: (cwd: string | null) => Promise<McpResult>;
  account?: (action: ProviderAccountAction) => Promise<ProviderAccountResult>;
  discover: (cwd: string) => Promise<ClaudeDiscovery>;
  now: () => string;
  nextId: () => ReturnType<typeof randomUUID>;
  requestLifetimeMs?: number;
}
export interface ClaudeActive extends ProviderExecution {
  session: ClaudeSession;
  emit: EmitProviderUpdate;
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

export type ClaudeToolFrame = Extract<ClaudeFrame, { kind: "tool" }>;
