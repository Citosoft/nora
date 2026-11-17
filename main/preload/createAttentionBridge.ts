import { z } from "zod";
import { openThreadChannel } from "@shared/conversations/attention";
import type { AttentionBridge } from "@shared/ipc/types/attentionGateway.types";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

const payloadSchema = z.object({ conversationId: z.string().min(1).max(512) }).strict();

export function createAttentionBridge(): AttentionBridge {
  return { onOpenThread(listener) {
    return subscribeToIpcEvent<unknown>(openThreadChannel, (payload) => {
      const parsed = payloadSchema.safeParse(payload);
      if (parsed.success) listener(parsed.data.conversationId);
    });
  } };
}
