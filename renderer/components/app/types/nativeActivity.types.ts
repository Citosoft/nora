import type { ApprovalRequest, RequestResponse, TimelineItem, ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";
import type { NativeTurnTimeProps } from "./nativeConversation.types";

export interface NativeToolActivityProps { item: ToolActivity; }
export interface NativeToolHistoryProps { items: readonly ToolActivity[]; }
export type ReasoningActivity = Extract<TimelineItem, { kind: "reasoning" }>;
export interface NativeReasoningProps { items: readonly ReasoningActivity[]; }
export type NativeTimelineEntry =
  | { kind: "item"; item: Exclude<TimelineItem, ToolActivity | ReasoningActivity> }
  | { kind: "tools"; runId: string; items: ToolActivity[] }
  | { kind: "reasoning"; runId: string; items: ReasoningActivity[] };
export interface NativeTimelineRow { key: string; entry: NativeTimelineEntry; timing: NativeTurnTimeProps | null; }
export interface NativeToolHistorySummary { label: string; state: ToolState; count: number; failedCount: number; }
export interface NativeApprovalProps {
  request: ApprovalRequest;
  disabled: boolean;
  onRespond(response: RequestResponse): Promise<void>;
}
export interface ApprovalAction {
  option: ApprovalRequest["options"][number];
  intent: "allow" | "deny" | "cancel" | "other";
}
export interface ApprovalActionGroups {
  primary: ApprovalAction | null;
  secondary: ApprovalAction[];
  negative: ApprovalAction[];
}
