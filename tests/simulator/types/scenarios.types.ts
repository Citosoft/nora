import type { JsonValue } from "@main/types/execution/rpc.types";
import type { ApprovalDetails, ApprovalRequest, ExecutionFailure, QuestionRequest, RequestResponse, SubagentActivity, TimelineItem, ToolActivity, ToolDetails } from "@shared/types/conversation/contracts.types";
import type { EmitProviderUpdate, ProviderExecution } from "@main/types/execution/provider.types";

export type ScenarioId = "tour" | "tools" | "markdown" | "questions" | "approvals" | "approval-stack" | "background-requests" | "suggestions" | "connector-sign-in" | "failure" | "usage-limit" | "recovery" | "expired" | "long-output" | "slow" | "subagents" | "skills" | "provider-switch" | "output-budget" | "mcp-app" | "secrets";
export interface SimulatorScenario { id: ScenarioId; label: string; description: string; }
type SimulatorDisplayKind = "plan" | "subagent" | "changes" | "milestone" | "connector-sign-in";
export type SimulatorDisplayItem = { [Kind in SimulatorDisplayKind]: Omit<Extract<TimelineItem, { kind: Kind }>, "id" | "runId" | "createdAt"> }[SimulatorDisplayKind];
export interface SimulatorApprovalStep { kind: "approval"; title: string; details: ApprovalDetails; options: ApprovalRequest["options"]; }
export type SimulatorStep =
  | { kind: "output-budget" }
  | { kind: "text"; text: string }
  | { kind: "suggestion"; text: string }
  /** `details` adds what a real adapter would attach: the subagent that ran the tool, or the skill it used. */
  | { kind: "tool"; native: JsonValue; complete: boolean; details?: Pick<ToolDetails, "parentId" | "skill"> }
  | { kind: "display"; id: string; item: SimulatorDisplayItem }
  | { kind: "questions"; questions: QuestionRequest["questions"]; expire?: boolean }
  | SimulatorApprovalStep
  | { kind: "approval-batch"; approvals: readonly SimulatorApprovalStep[] }
  /** Opens the secure input dialog for a secret, as the request_secret tool does. */
  | { kind: "secret-request"; name: string; purpose: string; multiline?: boolean }
  /** Asks to run a command with saved secrets, as run_with_secrets does; the command itself is never executed. */
  | { kind: "secret-run"; command: string; secrets: readonly string[] }
  | { kind: "pause"; milliseconds: number }
  | { kind: "failure"; failure?: ExecutionFailure }
  | { kind: "recovery" };
export interface SimulatorExecution extends ProviderExecution {
  emit: EmitProviderUpdate;
  controller: AbortController;
  done: boolean;
  tools: Map<string, ToolActivity>;
  agents: Map<string, SubagentActivity>;
  responses: Map<string, (response: RequestResponse | null) => void>;
  promptSuggestion?: string;
}
