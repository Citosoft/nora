import type { BotMemoryBridge } from "@shared/ipc/types/botMemoryGateway.types";

export const botMemoryClient: BotMemoryBridge = {
  request: (input) => window.nora.botMemory.request(input),
  reviewActivity: () => window.nora.botMemory.reviewActivity()
};
