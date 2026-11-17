import type { z } from "zod";
import type { mcpAppActionSchema, mcpAppPermissionsSchema, mcpAppRequestSchema, mcpAppResultSchema } from "@shared/providers/mcpApp";

export type McpAppAction = z.infer<typeof mcpAppActionSchema>;
export type McpAppRequest = z.infer<typeof mcpAppRequestSchema>;
export type McpAppResult = z.infer<typeof mcpAppResultSchema>;
export type McpAppPermissions = z.infer<typeof mcpAppPermissionsSchema>;
