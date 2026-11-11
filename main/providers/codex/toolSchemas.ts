import { z } from "zod";

const base = { id: z.string(), status: z.string().optional() };
const duration = { durationMs: z.number().nonnegative().nullable().optional() };
export const codexToolSchema = z.discriminatedUnion("type", [
  z.object({ ...base, ...duration, type: z.literal("commandExecution"), command: z.string(), cwd: z.string().optional(),
    aggregatedOutput: z.string().nullable().optional(), exitCode: z.number().int().nullable().optional() }),
  z.object({ ...base, ...duration, type: z.literal("mcpToolCall"), server: z.string(), tool: z.string(), arguments: z.json().optional(),
    result: z.object({ content: z.array(z.json()), structuredContent: z.json().optional(), isError: z.boolean().optional() }).nullable().optional(),
    error: z.object({ message: z.string() }).nullable().optional() }),
  z.object({ ...base, ...duration, type: z.literal("dynamicToolCall"), tool: z.string(), namespace: z.string().nullable().optional(),
    arguments: z.json().optional(), contentItems: z.array(z.json()).nullable().optional(), success: z.boolean().nullable().optional() }),
  z.object({ ...base, type: z.literal("functionCallOutput"), name: z.string(), namespace: z.string().nullable().optional(), output: z.json() }),
  z.object({ ...base, type: z.literal("webSearch"), query: z.string(), action: z.object({ type: z.string(),
    url: z.string().optional(), pattern: z.string().optional(), query: z.string().optional(), queries: z.array(z.string()).optional() }).nullable().optional() }),
  z.object({ ...base, type: z.literal("imageView"), path: z.string() }),
  z.object({ ...base, type: z.literal("imageGeneration"), savedPath: z.string().nullable().optional(), revisedPrompt: z.string().nullable().optional(),
    failure: z.object({ message: z.string().optional() }).nullable().optional() }),
  z.object({ ...base, type: z.literal("sleep"), durationMs: z.number().nonnegative() }),
  z.object({ ...base, type: z.literal("collabAgentToolCall"), tool: z.string(), prompt: z.string().nullable().optional(), receiverThreadIds: z.array(z.string()).optional() }),
  z.object({ ...base, type: z.literal("collabToolCall"), tool: z.string(), prompt: z.string().nullable().optional() }),
  z.object({ ...base, type: z.literal("subAgentActivity"), agentPath: z.string(), agentThreadId: z.string(), kind: z.json() })
]);
export const nativeItemEnvelopeSchema = z.object({ threadId: z.string(), turnId: z.string(), item: z.json() });
export const nativeItemIdentitySchema = z.object({ id: z.string(), type: z.string(), status: z.string().optional() });
export const toolProgressSchema = z.object({ threadId: z.string(), turnId: z.string(), itemId: z.string(), message: z.string() });
export const terminalInteractionSchema = z.object({ threadId: z.string(), turnId: z.string(), itemId: z.string(), stdin: z.string() });
