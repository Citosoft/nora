import type { z } from "zod";
import type { mcpAppCallSchema, mcpAppDisplayModeSchema, mcpAppToolResultSchema } from "@shared/conversations/mcpApp";

export type McpAppCall = z.infer<typeof mcpAppCallSchema>;
export type McpAppDisplayMode = z.infer<typeof mcpAppDisplayModeSchema>;
export type McpAppToolResult = z.infer<typeof mcpAppToolResultSchema>;
