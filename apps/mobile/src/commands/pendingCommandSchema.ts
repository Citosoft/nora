import { z } from "zod";
import { requestResponseSchema } from "@shared/conversations/contracts";
import { botIdSchema } from "@shared/bots/contracts";
import { remoteBotScopeSchema } from "@shared/remote-access/runtimeApi";

const id = z.string().min(1).max(512);
const base = {
  key: z.string().min(1),
  runtimeId: id,
  conversationId: id,
  createdAt: z.string().datetime(),
  /** The last uncertain failure, shown beside the retry button. */
  lastError: z.string().nullable()
};

/** The first message of a new conversation, sent once the conversation exists. */
const firstMessage = z.object({ commandId: id, runId: id, instruction: z.string().min(1) }).strict();

/** Validates commands read back from device storage; anything malformed is dropped rather than replayed. */
export const pendingCommandSchema = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("send-message"), commandId: id, runId: id, instruction: z.string().min(1) }).strict(),
  z.object({ ...base, kind: z.literal("create-conversation"), commandId: id, projectId: id, title: z.string().min(1),
    /** Set once the create receipt arrived, so a retry only resends the first message. */
    created: z.boolean(),
    message: firstMessage }).strict(),
  /** A bot's direct chat; the runtime picks its workspace, so only the bot and the chat's scope are saved. */
  z.object({ ...base, kind: z.literal("create-bot-chat"), commandId: id, botId: botIdSchema, scope: remoteBotScopeSchema, title: z.string().min(1),
    created: z.boolean(), message: firstMessage }).strict(),
  z.object({ ...base, kind: z.literal("decide-action"), commandId: id, requestId: id, response: requestResponseSchema }).strict(),
  z.object({ ...base, kind: z.literal("cancel-task"), commandId: id, runId: id }).strict()
]);

export const pendingCommandListSchema = z.array(z.unknown()).transform((values) =>
  values.flatMap((value) => {
    const parsed = pendingCommandSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  }));
