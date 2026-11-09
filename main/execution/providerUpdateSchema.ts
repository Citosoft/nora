import { z } from "zod";
import { failureSchema, requestSchema, timelineItemSchema, usageSchema } from "@shared/conversations/contracts";

const base = { eventId: z.string().min(1), conversationId: z.string().min(1), runId: z.string().min(1), attemptId: z.string().min(1) };
export const providerUpdateSchema = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("bound"), nativeConversationId: z.string().min(1) }).strict(),
  z.object({ ...base, kind: z.literal("started"), nativeConversationId: z.string().min(1), nativeTurnId: z.string().min(1) }).strict(),
  z.object({ ...base, kind: z.literal("item"), item: timelineItemSchema }).strict(),
  z.object({ ...base, kind: z.literal("request"), request: requestSchema }).strict(),
  z.object({ ...base, kind: z.literal("request-resolved"), requestId: z.string().min(1) }).strict(),
  z.object({ ...base, kind: z.literal("request-expired"), requestId: z.string().min(1) }).strict(),
  z.object({ ...base, kind: z.literal("finished"), status: z.enum(["completed", "failed", "interrupted"]), failure: failureSchema.nullable(), usage: usageSchema.nullable() }).strict(),
  z.object({ ...base, kind: z.literal("disconnected"), failure: failureSchema }).strict()
]);
