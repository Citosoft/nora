import { z } from "zod";

export const claudeToolCallSchema = z.object({ type: z.enum(["tool_use", "server_tool_use"]), id: z.string(), name: z.string(), input: z.json() });
export const claudeToolResultSchema = z.object({ type: z.string().refine((type) => type.endsWith("tool_result")), tool_use_id: z.string(),
  content: z.json().optional(), is_error: z.boolean().optional() });
