import type { z } from "zod";
import type { mcpActionSchema, mcpRequestSchema, mcpResultSchema, mcpServerSchema } from "@shared/providers/mcp";

export type McpAction = z.infer<typeof mcpActionSchema>;
export type McpRequest = z.infer<typeof mcpRequestSchema>;
export type McpResult = z.infer<typeof mcpResultSchema>;
export type McpServer = z.infer<typeof mcpServerSchema>;
