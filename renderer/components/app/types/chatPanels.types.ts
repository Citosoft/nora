import type { ProviderConnectionKind } from "@shared/types/provider/account.types";
import type { ChatActivityEvent } from "./chatActivity.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ChatWorkPhase } from "./chatWork.types";
import type { ChatContextInspectorInput } from "./chatContext.types";
import type { ConnectorSubject } from "@shared/types/connectors/connectors.types";
import type { ChatSidebarThreads } from "./chatThreadDetail.types";
import type { ReactNode, RefObject } from "react";
import type { ComposerEditorHandle } from "./composerEditor.types";
import type { ComposerSuggestionOption } from "./composerInput.types";
import type { BotAuthor, BotAvatar } from "@shared/types/bots/bots.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { MarkdownRendererLinkClickHandler } from "@/components/app/types/markdownRenderer.types";
import type { BotAvatarState } from "./botAvatar.types";
import type { ChatBranchRequest } from "@shared/ipc/types/chatBranchGateway.types";
import type { ChatBranch, ChatBranchOrigin, ProviderBinding } from "@shared/types/conversation/contracts.types";

/** Who a chat is with: one bot (a direct chat) or a group's members. */
export type ChatParticipants =
  | { kind: "direct"; bot: { botId: string; name: string; role: string; avatar: BotAvatar } }
  | { kind: "group"; members: readonly { botId: string; name: string; role: string; avatar: BotAvatar }[]; writer: string | null; lead: string | null };
/** A work thread behind a chat, as the chat shows it; `branch` marks a side chat the user started rather than a task the chat routed. */
export interface ChatWorkThread { connection: ProviderConnectionKind; providerKind: ProviderBinding["kind"]; model: string; canSettle: boolean; latestRun: ConversationSummary["latestRun"]; phase: ChatWorkPhase; author: ChatBranchBot | null; status: string; id: string; botId: string | null; title: string; workspaceId: string; workspaceName: string | null; working: boolean; waiting: boolean; settled: boolean; branch: ChatBranch | null; createdAt: string; updatedAt: string; }
/** A branch being started: shown as its own tab until its first message creates the thread (`threadId`) and that thread is listed. */
export interface ChatBranchDraft {
  key: string; botId: string; from: ChatBranchOrigin | null; threadId: string | null;
  /** Generated from `from` with the simple AI tasks model; null while naming, when it failed, or for a blank branch (named from its first message). */
  title: string | null;
  naming: boolean;
}
/** Every identity a branch message needs, chosen before sending so a retry repeats the same commands. */
export type ChatBranchIds = ChatBranchRequest["ids"];
/** A branch tab's unsent text, and the identities of a message whose delivery was not confirmed. */
export interface ChatBranchComposerState { text: string; pending: ChatBranchIds | null; }
/** What a branch tab shows: an existing work thread, or a draft branch. */
export type ChatBranchTarget = { kind: "thread"; thread: ChatWorkThread } | { kind: "draft"; draft: ChatBranchDraft };
/** The bot a branch is with. */
export type ChatBranchBot = Extract<ChatParticipants, { kind: "direct" }>["bot"];
/** One row of a chat transcript: a message (grouped with the author's previous one when `continued`) or a quiet notice. */
export type ChatEntry =
  | { kind: "message"; id: string; from: "user" | "bot"; author: BotAuthor | null; text: string; createdAt: string; complete: boolean;
    workThreadId: string | null; continued: boolean }
  | { kind: "notice"; id: string; text: string; workThreadId?: string };
export interface ChatMessageProps {
  entry: Extract<ChatEntry, { kind: "message" }>;
  workThread: ChatWorkThread | null;
  onOpenThread(conversationId: string): void;
  /** Starts a branch from this bot message; absent where branching does not apply. */
  onBranch?(entry: Extract<ChatEntry, { kind: "message" }>): void;
  onLinkClick?: MarkdownRendererLinkClickHandler;
}
export interface ChatTranscriptProps {
  entries: readonly ChatEntry[];
  workThreads: ReadonlyMap<string, ChatWorkThread>;
  onOpenThread(conversationId: string): void;
  onBranch?(entry: Extract<ChatEntry, { kind: "message" }>): void;
  onLinkClick?: MarkdownRendererLinkClickHandler;
}
export interface ChatHeaderProps {
  participants: ChatParticipants;
  tabs: readonly ChatWorkThread[];
  drafts: readonly ChatBranchDraft[];
  /** Absent until the chat exists, since a branch starts from a saved chat. */
  onNewBranch?(botId: string): void;
  onCloseDraft(key: string): void;
  /** Settles a work thread or branch, removing its tab. */
  onCloseThread(threadId: string): void;
}
export interface ChatGroupIdentityProps { group: Extract<ChatParticipants, { kind: "group" }>; }
export interface ChatTabProps { thread: ChatWorkThread; onClose(): void; }
/** `thread` is the one being closed; the dialog is open while it is set. `onConfirm` rejects with a reason when the thread cannot settle. */
export interface ChatCloseThreadDialogProps { thread: ChatWorkThread | null; onCancel(): void; onConfirm(threadId: string): Promise<void>; }
export interface ChatTabCloseButtonProps { label: string; disabled?: boolean; onClose(): void; }
export interface ChatDraftTabProps { draft: ChatBranchDraft; name: string; onClose(): void; }
export interface ChatNewBranchButtonProps { participants: ChatParticipants; onNewBranch(botId: string): void; }
export interface ChatBranchInfoPanelProps {
  target: ChatBranchTarget;
  bot: ChatBranchBot;
  /** The thread's current model, once loaded. */
  model: string | null;
  /** Where the chat starts new work, named for a draft that has no workspace of its own yet; null when unavailable. */
  chatWorkspaceName: string | null;
  onOpenThread(conversationId: string): void;
}
export interface ChatBranchViewProps {
  target: ChatBranchTarget;
  bot: ChatBranchBot;
  chatId: string | null;
  composer: ChatBranchComposerState;
  onComposerChange(patch: Partial<ChatBranchComposerState>): void;
  /** The draft's first message created this thread. */
  onStarted(threadId: string): void;
  onOpenThread(conversationId: string): void;
  onLinkClick?: MarkdownRendererLinkClickHandler;
  /** Where the chat starts new work, shown for a draft branch. */
  chatWorkspaceName: string | null;
}
export interface ChatGreetingProps { participants: ChatParticipants; }
export interface ChatTypingProps { botId: string; name: string; avatar: BotAvatar; workspaceName: string | null; waiting: boolean; }
export interface ChatWorkspacePickerProps {
  workspaces: readonly NativeWorkspace[];
  selectedId: string;
  /** Workspace bots only work in their own workspace, so the choice is shown but fixed. */
  fixed: boolean;
  disabled: boolean;
  onSelect(workspaceId: string): void;
}
/** Requests from the chat's work threads, or only from `threadId` when given. */
export interface ChatRequestsProps { conversationId: string; threadId?: string; }
export interface ChatComposerProps {
  inputRef: RefObject<ComposerEditorHandle | null>;
  value: string;
  placeholder: string;
  disabled: boolean;
  canSend: boolean;
  /** Stop replaces Send while a reply is underway and nothing new is typed. */
  stop: { label: string; disabled: boolean; onStop(): void } | null;
  sendLabel: string;
  mentions?: readonly ComposerSuggestionOption[];
  /** Controls under the input, such as where a direct chat works. */
  footer?: ReactNode;
  onChange(text: string): void;
  onSubmit(): void;
}

export interface ChatWorkPanelProps {
  activity: readonly ChatActivityEvent[];
  threads: readonly ChatWorkThread[];
  onOpenThread(id: string): void;
  onSettleThread(id: string): Promise<void>;
}
/** The tabs of a chat's right sidebar. */
export type ChatSidebarTab = "work" | "connectors" | "context";
/**
 * The chat's right sidebar: the bot's work and activity, the connectors a direct chat's bot gets (`connectors`, null in group chats),
 * and the developer context preview where it is available. Opening a thread from the activity shows its detail in place.
 */
export interface ChatSidebarProps {
  /** The direct chat's bot, headed above the tabs; null in group chats, whose members already head the chat. */
  bot: ChatSidebarBot | null;
  work: Omit<ChatWorkPanelProps, "onOpenThread">;
  threads: ChatSidebarThreads;
  connectors: ConnectorSubject | null;
  context: ChatContextInspectorInput;
}
/** The bot a direct chat's sidebar is headed by, with its live face state. */
/** Resetting a saved direct chat; `disabled` while it has work in flight, which the reset would refuse. */
export interface ChatResetControl { disabled: boolean; run(): Promise<void>; }
export interface ChatSidebarBot { bot: ChatBranchBot; state: BotAvatarState; reset: ChatResetControl | null; }
export interface ChatResetDialogProps { open: boolean; name: string; onCancel(): void; onConfirm(): Promise<void>; }
export interface ChatConnectorsPanelProps { subject: ConnectorSubject; }
