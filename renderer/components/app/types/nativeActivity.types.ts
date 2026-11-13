import type { BotAvatar } from "@shared/types/bots/bots.types";
import type { ApprovalRequest, RequestResponse, TimelineItem, ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";
import type { NativeTurnTimeProps } from "./nativeConversation.types";

export interface NativeToolActivityProps { item: ToolActivity; }
export interface NativeToolHistoryProps { items: readonly ToolActivity[]; }
export type ReasoningActivity = Extract<TimelineItem, { kind: "reasoning" }>;
export interface NativeReasoningProps { items: readonly ReasoningActivity[]; }
export type NativeTimelineEntry =
  | { kind: "item"; item: Exclude<TimelineItem, ToolActivity | ReasoningActivity> }
  | { kind: "tools"; runId: string; items: ToolActivity[] }
  | { kind: "reasoning"; runId: string; items: ReasoningActivity[] }
  /** A bot asked another bot; shown as its own card instead of inside the turn's tool activity. */
  | { kind: "ask"; call: AskBotCall };
/** An `ask_bot` call as its card shows it. `message` is null when the runtime truncated the arguments. */
export interface AskBotCall { tool: ToolActivity; bot: string; message: string | null; threadId: string | null; reply: string | null; error: string | null; }
export interface NativeAskBotCardProps {
  call: AskBotCall;
  /** The asked bot's face and name when it is still in this workspace's catalog. */
  bot: { name: string; avatar: BotAvatar } | null;
  onOpenThread?: (conversationId: string) => void;
}
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
export interface CompactApprovalActions { allow: ApprovalAction | null; decline: ApprovalAction | null; more: readonly ApprovalAction[]; }
export interface ApprovalActionGroups {
  primary: ApprovalAction | null;
  secondary: ApprovalAction[];
  negative: ApprovalAction[];
}
