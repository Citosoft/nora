import type { JsonValue } from "@main/types/execution/rpc.types";
import type { ApprovalDetails, ApprovalRequest, ExecutionFailure, QuestionRequest, RequestResponse, TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";
import type { EmitProviderUpdate, ProviderExecution } from "@main/types/execution/provider.types";

export type ScenarioId = "tour" | "tools" | "markdown" | "questions" | "approvals" | "failure" | "usage-limit" | "recovery" | "expired" | "long-output" | "slow";
export interface SimulatorScenario { id: ScenarioId; label: string; description: string; }
export type SimulatorDisplayItem = { [Kind in "plan" | "subagent" | "changes" | "milestone"]:
  Omit<Extract<TimelineItem, { kind: Kind }>, "id" | "runId" | "createdAt"> }["plan" | "subagent" | "changes" | "milestone"];
export type SimulatorStep =
  | { kind: "text"; text: string }
  | { kind: "tool"; native: JsonValue; complete: boolean }
  | { kind: "display"; id: string; item: SimulatorDisplayItem }
  | { kind: "questions"; questions: QuestionRequest["questions"]; expire?: boolean }
  | { kind: "approval"; title: string; details: ApprovalDetails; options: ApprovalRequest["options"] }
  | { kind: "pause"; milliseconds: number }
  | { kind: "failure"; failure?: ExecutionFailure }
  | { kind: "recovery" };
export interface SimulatorExecution extends ProviderExecution {
  emit: EmitProviderUpdate;
  controller: AbortController;
  done: boolean;
  tools: Map<string, ToolActivity>;
  response?: (response: RequestResponse | null) => void;
}
