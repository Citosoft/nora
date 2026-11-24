import type { RefObject } from "react";
import type { Conversation, ConversationCommand, PinnedMessage, TimelineItem } from "@shared/types/conversation/contracts.types";

/** What a transcript message needs to show and change its own pin. */
export interface MessagePinControls {
  isPinned(itemId: string): boolean;
  toggle(itemId: string): void;
}
/** A thread's pinned messages, and how to change them or bring one into view. */
export interface MessagePins extends MessagePinControls {
  pins: readonly PinnedMessage[];
  /** Scrolls to a pinned message, loading earlier history first when it is not in the loaded part of the transcript. */
  jumpTo(itemId: string): void;
  /** The pin being looked for in earlier history, while that loads. */
  seeking: string | null;
  /** Set when a jump could not find its message. */
  notice: string | null;
}
export interface MessagePinsInput {
  conversation: Conversation | null;
  items: readonly TimelineItem[];
  execute(command: ConversationCommand): Promise<void>;
  scrollRef: RefObject<HTMLElement | null>;
  hasOlderHistory: boolean;
  loadOlder(): Promise<void>;
  /** Stops the transcript following new output, so a jump is not undone by the next reply. */
  onNavigate(): void;
}
export interface ThreadPinnedMessagesProps { pins: MessagePins; }
export interface ThreadPinnedMessageRowProps { pin: PinnedMessage; seeking: boolean; onJump(): void; onUnpin(): void; }
