import type { ReactNode, RefObject } from "react";
import type { ComposerEditorHandle } from "./composerEditor.types";
import type { ComposerSuggestionOption } from "./composerInput.types";
import type { BotAuthor, BotAvatar } from "@shared/types/bots/bots.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { MarkdownRendererLinkClickHandler } from "@/components/app/types/markdownRenderer.types";
import type { BotAvatarState } from "./botAvatar.types";

/** Who a chat is with: one bot (a direct chat) or a group's members. */
export type ChatParticipants =
  | { kind: "direct"; bot: { botId: string; name: string; role: string; avatar: BotAvatar } }
  | { kind: "group"; members: readonly { botId: string; name: string; role: string; avatar: BotAvatar }[]; writer: string | null; lead: string | null };
/** A work thread behind a chat, as the chat shows it. */
export interface ChatWorkThread { id: string; botId: string | null; title: string; workspaceName: string | null; working: boolean; waiting: boolean; updatedAt: string; }
/** One row of a chat transcript: a message (grouped with the author's previous one when `continued`) or a quiet notice. */
export type ChatEntry =
  | { kind: "message"; id: string; from: "user" | "bot"; author: BotAuthor | null; text: string; createdAt: string; complete: boolean;
    workThreadId: string | null; continued: boolean }
  | { kind: "notice"; id: string; text: string };
export interface ChatMessageProps {
  entry: Extract<ChatEntry, { kind: "message" }>;
  workThread: ChatWorkThread | null;
  onOpenThread(conversationId: string): void;
  onLinkClick?: MarkdownRendererLinkClickHandler;
}
export interface ChatTranscriptProps {
  entries: readonly ChatEntry[];
  workThreads: ReadonlyMap<string, ChatWorkThread>;
  onOpenThread(conversationId: string): void;
  onLinkClick?: MarkdownRendererLinkClickHandler;
}
export interface ChatHeaderProps { participants: ChatParticipants; state: BotAvatarState; }
export interface ChatGreetingProps { participants: ChatParticipants; }
export interface ChatTypingProps { name: string; avatar: BotAvatar; workspaceName: string | null; waiting: boolean; }
export interface ChatWorkspacePickerProps {
  workspaces: readonly NativeWorkspace[];
  selectedId: string;
  /** Workspace bots only work in their own workspace, so the choice is shown but fixed. */
  fixed: boolean;
  disabled: boolean;
  onSelect(workspaceId: string): void;
}
export interface ChatRequestsProps { conversationId: string; }
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
