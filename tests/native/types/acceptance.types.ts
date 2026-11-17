import type { LocalHostOptions } from "@main/types/execution/localHost.types";
import type { ExecutionHost } from "@main/execution/host";
import type { ConversationRun, TimelineItem, RuntimeRequest, WorkspaceRef } from "@shared/types/conversation/contracts.types";

export interface AcceptanceConfig {
  provider: "codex" | "claude";
  scenario: "lifecycle" | "approval" | "question" | "signed-out" | "host-crash" | "provider-crash";
  executable: string;
  authFile?: string;
  model?: string;
  reportPath: string;
}
export interface AcceptanceCheck { name: string; status: "passed" | "failed" | "unverified"; detail: string }
export interface AcceptanceReport {
  outcome: "passed" | "partial" | "blocked" | "failed";
  provider: AcceptanceConfig["provider"];
  scenario: AcceptanceConfig["scenario"];
  runtime: string;
  model: string | null;
  checkedAt: string;
  checks: AcceptanceCheck[];
  workspaceRemoved: boolean;
}
export interface AcceptanceEnvironment {
  directory: string;
  workspacePath: string;
  selection: WorkspaceRef;
  options: LocalHostOptions;
}
export interface AcceptanceView {
  runs: Map<string, ConversationRun>;
  items: Map<string, TimelineItem>;
  requests: Map<string, RuntimeRequest>;
  streamedRuns: Set<string>;
  stop: () => void;
}
export interface AcceptanceContext {
  host: ExecutionHost;
  view: AcceptanceView;
  checks: AcceptanceCheck[];
}
