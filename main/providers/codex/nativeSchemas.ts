import { z } from "zod";

// Codex 0.167 advertises non-empty effort identifiers rather than a closed enum.
export const reasoningEffortSchema = z.string().min(1).max(128);
const turnErrorSchema = z.object({ codexErrorInfo: z.string().or(z.record(z.string(), z.json())).nullable().optional() });
export const turnEventSchema = z.object({ threadId: z.string(), turn: z.object({ id: z.string(), status: z.string(), error: turnErrorSchema.nullable().optional() }) });
export const deltaSchema = z.object({ threadId: z.string(), turnId: z.string(), itemId: z.string(), delta: z.string() });
export const routingSchema = z.object({ threadId: z.string() });
export const itemEventSchema = z.object({ threadId: z.string(), turnId: z.string(), item: z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("agentMessage"), text: z.string() }),
  z.object({ id: z.string(), type: z.literal("reasoning"), summary: z.array(z.string()), content: z.array(z.string()) }),
  z.object({ id: z.string(), type: z.literal("fileChange"), status: z.string().optional(), changes: z.array(z.object({ path: z.string(), diff: z.string().optional() })) })
]) });
export const questionSchema = z.object({ threadId: z.string(), turnId: z.string(), questions: z.array(z.object({ id: z.string(), question: z.string(), isOther: z.boolean().optional(), options: z.array(z.object({ label: z.string() })).nullable().optional() })) });
export const readThreadSchema = z.object({ thread: z.object({ id: z.string(), turns: z.array(z.object({ id: z.string(), status: z.string(), items: z.array(z.json()), error: turnErrorSchema.nullable().optional() })) }) });
const tokenCount = z.number().int().nonnegative();
const tokenBreakdownSchema = z.object({ inputTokens: tokenCount, outputTokens: tokenCount, cachedInputTokens: tokenCount.optional() });
/** `last` is the latest model request (the live context); `total` accumulates the whole thread. */
export const usageEventSchema = z.object({ threadId: z.string(), tokenUsage: z.object({ total: tokenBreakdownSchema,
  last: tokenBreakdownSchema.optional(), modelContextWindow: z.number().int().positive().nullable().optional() }) });
export const modelListSchema = z.object({ data: z.array(z.object({ model: z.string(), displayName: z.string(), description: z.string(),
  hidden: z.boolean(), defaultReasoningEffort: reasoningEffortSchema, supportedReasoningEfforts: z.array(z.object({ reasoningEffort: reasoningEffortSchema })) })),
  nextCursor: z.string().nullable().optional() });
export const accountSchema = z.object({ requiresOpenaiAuth: z.boolean(), account: z.object({ type: z.string() }).nullable().optional() });

const rateLimitWindowSchema = z.object({ usedPercent: z.number(), resetsAt: z.number().int().nullable().optional() });
export const rateLimitsEventSchema = z.object({ rateLimits: z.object({
  primary: rateLimitWindowSchema.nullable().optional(), secondary: rateLimitWindowSchema.nullable().optional()
}) });
