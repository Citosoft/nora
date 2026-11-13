import { z } from "zod";
import { BOT_MEMORY_TEXT_MAX, botIdSchema, botMemoryEntrySchema } from "./contracts";

const id = z.string().min(1).max(512);
export const botMemoryChannel = "bot-memory:request";
/** Every request names its bot; replies carry all of that bot's notes so the editor always shows the stored truth. */
export const botMemoryRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list"), botId: botIdSchema }).strict(),
  z.object({ kind: z.literal("add"), botId: botIdSchema, workspaceId: id.nullable(), text: z.string().trim().min(1).max(BOT_MEMORY_TEXT_MAX) }).strict(),
  z.object({ kind: z.literal("update"), botId: botIdSchema, id, text: z.string().trim().min(1).max(BOT_MEMORY_TEXT_MAX) }).strict(),
  z.object({ kind: z.literal("remove"), botId: botIdSchema, id }).strict()
]);
export const botMemoryReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), notes: z.array(botMemoryEntrySchema) }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
