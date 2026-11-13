import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { BotMemoryReply } from "@shared/ipc/types/botMemoryGateway.types";
import type { BotMemoryStore } from "./memory.types";

export interface BotMemoryIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<BotMemoryReply>): void;
    removeHandler(channel: string): void;
  };
  memory: BotMemoryStore;
  isAllowedSender(event: ConversationInvocation): boolean;
}
