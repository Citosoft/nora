import { z } from "zod";
import { botIdSchema } from "@shared/bots/contracts";

export const chatBranchesChannel = "chat-branches:start";
export const chatBranchNameChannel = "chat-branches:name";

const id = z.string().min(1);
/**
 * Starts a side chat with one bot of a direct or group chat. The window chooses every identity up front,
 * so retrying after a lost reply repeats the same create and submit instead of starting a second branch.
 */
export const chatBranchRequestSchema = z.object({
  chatId: id,
  botId: botIdSchema,
  /** The chat message the branch starts from; the bot sees the chat up to it. Null starts a blank branch. */
  fromItemId: id.nullable(),
  text: z.string().trim().min(1),
  /** A name already generated for the branch; without one, main names it from `text` after creating it. */
  title: z.string().trim().min(1).max(100).optional(),
  ids: z.object({ createCommandId: id, conversationId: id, submitCommandId: id, runId: id }).strict()
}).strict();
export const chatBranchReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), conversationId: id }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
/** Names a branch before it exists, from the message it branches from, with the simple AI tasks model. */
export const chatBranchNameRequestSchema = z.object({ message: z.string().trim().min(1) }).strict();
export const chatBranchNameReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), title: z.string().min(1) }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
