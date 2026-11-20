import type { z } from "zod";
import type { inboxReplySchema, inboxRequestSchema } from "@shared/inbox/gateway";
import type { InboxCommand, InboxSnapshot, InboxTarget } from "@shared/types/inbox/inbox.types";

export type InboxRequest = z.infer<typeof inboxRequestSchema>;
export type InboxReply = z.infer<typeof inboxReplySchema>;
export interface InboxBridge {
  list(): Promise<InboxSnapshot>;
  /** Applies a mark and returns the snapshot it produced; rejects with a user-meaningful message. */
  execute(command: InboxCommand): Promise<InboxSnapshot>;
  onChanged(listener: (snapshot: InboxSnapshot) => void): () => void;
  /** Fires when the user clicks an inbox notification. */
  onOpen(listener: (target: InboxTarget) => void): () => void;
}
