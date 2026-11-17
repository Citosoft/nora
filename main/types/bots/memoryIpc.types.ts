import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { BotMemoryReply } from "@shared/ipc/types/botMemoryGateway.types";
import type { MemoryReviewActivityReply } from "@shared/types/bots/memoryReview.types";
import type { BotMemoryStore } from "./memory.types";
import type { MemoryReviewLog } from "./memoryReview.types";

export interface BotMemoryIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<BotMemoryReply | MemoryReviewActivityReply>): void;
    removeHandler(channel: string): void;
  };
  memory: BotMemoryStore;
  reviews: Pick<MemoryReviewLog, "activity">;
  now(): Date;
  isAllowedSender(event: ConversationInvocation): boolean;
}
