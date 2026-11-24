import type { ConversationCommand, PinnedMessage } from "@shared/types/conversation/contracts.types";

export type MessagePinChange = Pick<Extract<ConversationCommand, { kind: "set-message-pin" }>, "itemId" | "pinned">;
export type MessagePinOutcome =
  | { kind: "unchanged" }
  | { kind: "changed"; pins: PinnedMessage[] }
  | { kind: "invalid"; reason: string };
