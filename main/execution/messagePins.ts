import { PINNED_MESSAGE_TEXT_LIMIT, PINNED_MESSAGES_LIMIT } from "@shared/conversations/contracts";
import type { Conversation, PinnedMessage, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { MessagePinChange, MessagePinOutcome } from "@main/types/execution/messagePins.types";

/** The words a pin shows: a chat message's own words rather than the instruction wrapping them, cut to the stored limit. */
function pinnedText(item: Extract<TimelineItem, { kind: "message" }>): string {
  const text = (item.chatText ?? item.text).trim();
  return text.length > PINNED_MESSAGE_TEXT_LIMIT ? `${text.slice(0, PINNED_MESSAGE_TEXT_LIMIT - 1).trimEnd()}…` : text;
}

/** A thread's pins after one pin change; `target` is the message being pinned, looked up from the store. */
export function applyMessagePin(conversation: Conversation, change: MessagePinChange, target: TimelineItem | null, now: string): MessagePinOutcome {
  const current = conversation.pinnedMessages ?? [];
  const pinned = current.some((pin) => pin.itemId === change.itemId);
  if (!change.pinned) return pinned ? { kind: "changed", pins: current.filter((pin) => pin.itemId !== change.itemId) } : { kind: "unchanged" };
  if (pinned) return { kind: "unchanged" };
  if (target?.kind !== "message" || !target.complete) return { kind: "invalid", reason: "Only a finished message can be pinned" };
  if (current.length >= PINNED_MESSAGES_LIMIT) return { kind: "invalid", reason: `A thread keeps at most ${PINNED_MESSAGES_LIMIT} pinned messages. Unpin one first` };
  const pin: PinnedMessage = { itemId: target.id, role: target.role, text: pinnedText(target), ...(target.author ? { author: target.author } : {}),
    messageAt: target.createdAt, pinnedAt: now };
  return { kind: "changed", pins: [...current, pin] };
}
