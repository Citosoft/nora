import type { BotAvatar } from "@shared/types/bots/bots.types";
import type { ApprovalRequest, RequestResponse, TimelineItem, ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";
import type { NativeTurnTimeProps } from "./nativeConversation.types";
import type { McpAppToolCall } from "./mcpApp.types";

export interface NativeToolActivityProps { item: ToolActivity; }
export interface NativeToolHistoryProps { items: readonly ToolActivity[]; }
export type ReasoningActivity = Extract<TimelineItem, { kind: "reasoning" }>;
export interface NativeReasoningProps { items: readonly ReasoningActivity[]; }
export type NativeTimelineEntry =
  | { kind: "item"; item: Exclude<TimelineItem, ToolActivity | ReasoningActivity> }
  | { kind: "tools"; runId: string; items: ToolActivity[] }
  | { kind: "reasoning"; runId: string; items: ReasoningActivity[] }
  /** A bot asked another bot; shown as its own card instead of inside the turn's tool activity. */
  | { kind: "ask"; call: AskBotCall }
  /** Nora or a bot saved a note with `remember`; shown as its own memory line so the user sees what was kept. */
  | { kind: "memory"; call: RememberCall }
  /** An MCP tool's widget; the call itself still appears in the turn's tool activity. */
  | { kind: "app"; call: McpAppToolCall }
  /** Images a tool wrote or delivered; the call itself still appears in the turn's tool activity. */
  | { kind: "images"; tool: ToolActivity; paths: string[] };
/** A `remember` call as its memory line shows it. `text` is null when the runtime truncated the arguments. */
export interface RememberCall { tool: ToolActivity; text: string | null; updated: boolean; workspace: boolean; }
export interface NativeMemoryLineProps { call: RememberCall; }
/** An `ask_bot` call as its card shows it. `message` is null when the runtime truncated the arguments. */
export interface AskBotCall { tool: ToolActivity; bot: string; message: string | null; threadId: string | null; reply: string | null; error: string | null; }
export interface NativeAskBotCardProps {
  call: AskBotCall;
  /** The asked bot's face and name when it is still in this workspace's catalog. */
  bot: { name: string; avatar: BotAvatar } | null;
  onOpenThread?: (conversationId: string) => void;
}
/**
 * What a running turn is doing when nothing else in the thread shows it: specific when the runtime says
 * so (`thinking`, `starting`, `stopping`), or a light `waiting` phrase while the model is between steps.
 */
export interface NativeTurnActivity { kind: "starting" | "thinking" | "waiting" | "stopping"; label: string; }
export interface NativeTurnActivityProps { activity: NativeTurnActivity; }
export interface NativeTimelineRow { key: string; entry: NativeTimelineEntry; timing: NativeTurnTimeProps | null; activity: NativeTurnActivity | null; }
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
