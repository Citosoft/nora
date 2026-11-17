import { z } from "zod";

export const jsonSchema = z.json();
export const rpcMessageSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: jsonSchema.optional(),
  result: jsonSchema.optional(),
  error: z.object({ code: z.number(), message: z.string() }).optional()
});
export const initializedSchema = z.object({ userAgent: z.string() });
export const threadSchema = z.object({ thread: z.object({ id: z.string(), path: z.string().nullable().optional() }) });
/** `thread/read` metadata: the rollout file Codex appends the thread's events to. */
export const rolloutPathSchema = z.object({ thread: z.object({ path: z.string().nullable().optional() }) });
export const turnSchema = z.object({ turn: z.object({ id: z.string() }) });
