import { z } from "zod";
import { contextUsageSchema } from "@shared/conversations/contracts";

export const directContextChannel = "direct-chats:context-preview";

const id = z.string().min(1);
/** Where the next direct-chat message would go: an open work thread, or a new one in a workspace. */
export const directContextTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("continue"), threadId: id }).strict(),
  z.object({ kind: z.literal("new"), workspaceId: id }).strict()
]);
/** A developer view of what the next message in a direct chat would send; read-only, it runs and freezes nothing. */
export const directContextRequestSchema = z.object({
  chatId: id,
  /** The composer draft, used as the next message; empty shows a placeholder in its place. */
  draft: z.string().max(200_000),
  /** The work thread to preview; null previews where the message goes when the router gives no answer. */
  target: directContextTargetSchema.nullable()
}).strict();

/** One part of a request: where it sits, its exact text, or null when only the provider sees it. */
export const directContextSectionSchema = z.object({
  id,
  label: z.string().min(1),
  placement: z.enum(["system", "history", "turn"]),
  text: z.string().nullable(),
  note: z.string().optional()
}).strict();
export const directContextModelRequestSchema = z.object({
  id: z.enum(["router", "work-thread"]),
  title: z.string().min(1),
  purpose: z.string().min(1),
  model: z.string().min(1),
  sections: z.array(directContextSectionSchema),
  /** What the provider measured for this thread's latest request; null for a new thread or when never reported. */
  lastRequest: contextUsageSchema.nullable()
}).strict();
export const directContextTargetOptionSchema = z.object({ target: directContextTargetSchema, label: z.string().min(1) }).strict();
export const directContextPreviewSchema = z.object({
  target: directContextTargetSchema,
  /** True when the target is the fallback, which the router's answer may override at send time. */
  fallback: z.boolean(),
  targets: z.array(directContextTargetOptionSchema),
  requests: z.array(directContextModelRequestSchema)
}).strict();
export const directContextReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), preview: directContextPreviewSchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
