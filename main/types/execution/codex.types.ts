import type { EmitProviderUpdate, ProviderExecution } from "./provider.types";
import type { JsonValue } from "./rpc.types";
import type { ExecutionUsage, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { z } from "zod";
import type { modelListSchema } from "@main/providers/codex/nativeSchemas";

export type CodexModelPage = z.infer<typeof modelListSchema>;

export interface CodexPolicy {
  approvalPolicy: "untrusted" | "on-failure" | "on-request" | "never";
  sandbox: "read-only" | "workspace-write" | "danger-full-access";
}
export interface CodexOptions {
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
  ready: Promise<string>;
  resolveReady: (id: string) => void;
  rejectReady: (error: Error) => void;
}
export interface CodexPendingRequest {
  attemptId: string;
  resolve: (response: JsonValue) => void;
  reject: (error: Error) => void;
}
