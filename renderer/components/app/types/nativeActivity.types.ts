import type { ApprovalRequest, RequestResponse, TimelineItem, ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";
import type { NativeTurnTimeProps } from "./nativeConversation.types";

export interface NativeToolActivityProps { item: ToolActivity; }
export interface NativeToolHistoryProps { items: readonly ToolActivity[]; }
export type NativeTimelineEntry = { kind: "item"; item: Exclude<TimelineItem, ToolActivity> } | { kind: "tools"; runId: string; items: ToolActivity[] };
export interface NativeTimelineRow { key: string; entry: NativeTimelineEntry; timing: NativeTurnTimeProps | null; }
export interface NativeToolHistorySummary { label: string; state: ToolState; count: number; failedCount: number; }
export interface NativeApprovalProps {
  request: ApprovalRequest;
  disabled: boolean;
  onRespond(response: RequestResponse): Promise<void>;
}
