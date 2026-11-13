import type { z } from "zod";
import type { botMemoryReplySchema, botMemoryRequestSchema } from "@shared/bots/memoryGateway";
import type { BotMemoryEntry } from "@shared/types/bots/bots.types";

export type BotMemoryRequest = z.infer<typeof botMemoryRequestSchema>;
export type BotMemoryReply = z.infer<typeof botMemoryReplySchema>;
export interface BotMemoryBridge { request(input: BotMemoryRequest): Promise<BotMemoryEntry[]>; }
