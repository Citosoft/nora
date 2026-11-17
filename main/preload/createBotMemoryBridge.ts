import { botMemoryChannel, botMemoryReplySchema } from "@shared/bots/memoryGateway";
import { memoryReviewActivityChannel, memoryReviewActivityReplySchema } from "@shared/bots/memoryReviewActivity";
import type { BotMemoryBridge } from "@shared/ipc/types/botMemoryGateway.types";
import { invokeIpc } from "./invokeIpc";

export function createBotMemoryBridge(): BotMemoryBridge {
  return {
    async request(input) {
      const reply = botMemoryReplySchema.safeParse(await invokeIpc(botMemoryChannel, input));
      if (!reply.success) throw new Error("Nora returned an incompatible response for bot notes");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.notes;
    },
    async reviewActivity() {
      const reply = memoryReviewActivityReplySchema.safeParse(await invokeIpc(memoryReviewActivityChannel, {}));
      if (!reply.success) throw new Error("Nora returned an incompatible response for memory review activity");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.activity;
    }
  };
}
