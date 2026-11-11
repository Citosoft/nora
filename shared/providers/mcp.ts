import { z } from "zod";
import { workspaceRefSchema } from "@shared/conversations/contracts";

export const mcpActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list") }).strict(),
  z.object({ kind: z.literal("refresh") }).strict(),
  z.object({ kind: z.literal("login"), serverName: z.string().min(1).max(512) }).strict()
]);
export const mcpRequestSchema = z.object({ schemaVersion: z.literal(1), environmentId: z.string().min(1).max(512),
  providerKind: z.enum(["claude", "codex"]), instanceId: z.string().min(1).max(512),
  workspace: workspaceRefSchema, action: mcpActionSchema }).strict();
export const mcpToolSchema = z.object({ name: z.string(), description: z.string().optional() }).strict();
export const mcpServerSchema = z.object({ name: z.string(),
  status: z.enum(["connected", "pending", "needs-auth", "failed", "disabled", "unknown"]),
  authStatus: z.enum(["authenticated", "needs-auth", "unsupported", "unknown"]),
  canLogin: z.boolean(), tools: z.array(mcpToolSchema), message: z.string().optional() }).strict();
export const mcpResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("servers"), servers: z.array(mcpServerSchema) }).strict(),
  z.object({ kind: z.literal("login"), authorizationUrl: z.url().refine((value) => ["https:", "http:"].includes(new URL(value).protocol)) }).strict(),
  z.object({ kind: z.literal("unavailable"), message: z.string() }).strict()
]);
