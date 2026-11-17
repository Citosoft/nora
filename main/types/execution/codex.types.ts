import type { NoraRunContextResolver } from "@main/types/nora-tools/noraTools.types";
import type { EmitProviderUpdate, ProviderExecution } from "./provider.types";
import type { JsonValue } from "./rpc.types";
import type { ApprovalRequest, ContextReading, ExecutionUsage, SubagentActivity, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { z } from "zod";
import type { modelListSchema, rateLimitsEventSchema, usageEventSchema } from "@main/providers/codex/nativeSchemas";

export type CodexRateLimits = z.infer<typeof rateLimitsEventSchema>["rateLimits"];
export type CodexModelPage = z.infer<typeof modelListSchema>;
export type CodexTokenBreakdown = z.infer<typeof usageEventSchema>["tokenUsage"]["total"];
export interface CodexRolloutUsage { total: ExecutionUsage; context: ContextReading | null; }
export interface CodexUsageUpdate { baseline: ExecutionUsage | null; usage: ExecutionUsage | null; }

export interface CodexPolicy {
  approvalPolicy: "untrusted" | "on-failure" | "on-request" | "never";
  sandbox: "read-only" | "workspace-write" | "danger-full-access";
}
export interface CodexOptions {
  /** Nora's per-run additions: its tool server and run guidance such as a bot's notes. */
  runContext?: NoraRunContextResolver;
  compactToolOutput?: () => boolean;
  instanceId: string;
  executable: string;
  arguments?: string[];
  environment?: NodeJS.ProcessEnv;
  policies: Readonly<Record<string, CodexPolicy>>;
  now: () => string;
  requestLifetimeMs?: number;
}
export interface CodexActive extends ProviderExecution {
  emit: EmitProviderUpdate;
  nativeTurnId: string | null;
  items: Map<string, TimelineItem>;
  usage: ExecutionUsage | null;
  usageBaseline: ExecutionUsage | null;
  ready: Promise<string>;
  resolveReady: (id: string) => void;
  rejectReady: (error: Error) => void;
}
export interface CodexPendingRequest {
  attemptId: string;
  decisions?: Readonly<Record<string, JsonValue>>;
  resolve: (response: JsonValue) => void;
  reject: (error: Error) => void;
}

export interface CodexApproval {
  request: Pick<ApprovalRequest, "title" | "details" | "options">;
  decisions: Readonly<Record<string, JsonValue>>;
}

/** Config layer type (`user`, `project`, `system`, …) keyed by each `mcp_servers.*` config path. */
export type CodexMcpOrigins = Readonly<Record<string, string>>;

/** What the Codex subagent normalizer needs from the active turn to merge an agent's latest state. */
export interface CodexSubagentContext {
  runId: string;
  now: string;
  complete: boolean;
  /** The agent's most recent item in this thread, from any turn. */
  find(nativeId: string): SubagentActivity | undefined;
}
export interface CodexSubagentUpdate {
  items: SubagentActivity[];
  /** True when the native item only describes agents and should not also appear as a tool. */
  replacesTool: boolean;
}
