import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { ConversationRun } from "@shared/types/conversation/contracts.types";
import type { ConversationClient } from "./conversationClient.types";
import type { ChatBranchBot, ChatBranchComposerState, ChatBranchTarget, ChatWorkThread } from "./chatPanels.types";

/** How a turn of a work thread ended, or that it is still going. */
export type ChatThreadTurnOutcome =
  | { kind: "queued" | "working" | "waiting" | "done" | "stopped"; label: string }
  | { kind: "failed"; label: string; detail: string | null };
/** One turn of a work thread, condensed for a side panel: what it was asked, how it went, and what it said at the end. */
export interface ChatThreadTurnSummary {
  runId: string;
  at: string;
  /** Who asked: the user directly ("you"), or the chat passing on work ("chat"). */
  request: { from: "you" | "chat"; text: string };
  outcome: ChatThreadTurnOutcome;
  /** When the turn finished; null while it is queued or going. */
  endedAt: string | null;
  /** The turn's last reply in full; null before it says anything. */
  reply: { text: string; at: string } | null;
  tools: number;
  failedTools: number;
  /** Files the turn changed. */
  files: readonly string[];
}
/** A thread opened in the chat sidebar, with the bot it is with. */
export interface ChatThreadDetailSource { thread: ChatWorkThread; bot: ChatBranchBot; }
/** How the sidebar finds a thread's detail; `resolve` is null for threads the chat no longer lists, which open in full instead. */
export interface ChatSidebarThreads {
  chatId: string | null;
  resolve(threadId: string): ChatThreadDetailSource | null;
  onOpenFull(threadId: string): void;
}
export interface ChatThreadDetailProps extends ChatThreadDetailSource {
  /** The sidebar's header already shows the bot (a direct chat), so the detail leaves it out; group chats show it with the status. */
  botInHeader: boolean;
  chatId: string | null;
  onBack(): void;
  onOpenFull(threadId: string): void;
}
/** A work thread's state as the detail header shows it: a word or two and a colour. */
export interface ChatThreadStatus { label: string; tone: "waiting" | "working" | "ready" | "settled"; }
export interface ChatThreadTimelineProps {
  turns: readonly ChatThreadTurnSummary[];
  botName: string;
  /** The reply the card below already shows in full, left out of the timeline. */
  featuredRunId: string | null;
}
export interface ChatThreadReplyCardProps { bot: ChatBranchBot; reply: { text: string; at: string }; children?: ReactNode; }
export interface ChatThreadSendInput {
  client: ConversationClient;
  target: ChatBranchTarget;
  chatId: string | null;
  composer: ChatBranchComposerState;
  onComposerChange(patch: Partial<ChatBranchComposerState>): void;
  /** A draft's first message created this thread. */
  onStarted?(threadId: string): void;
  reload(): void;
  /** The thread's running turn, which Stop interrupts. */
  active: ConversationRun | undefined;
}
export interface ChatThreadSend {
  sending: boolean;
  error: string | null;
  send(): Promise<void>;
  /** Stop replaces Send while a turn runs and nothing new is typed. */
  stop: { label: string; disabled: boolean; onStop(): void } | null;
}
/** One step on a thread's timeline: an icon on the rail, a line of text, an optional detail and its time. */
export interface ChatThreadStepProps {
  icon: LucideIcon;
  iconClass?: string;
  spin?: boolean;
  at: string | null;
  children: ReactNode;
  detail?: ReactNode;
}
