import { z } from "zod";
import { workspaceRefSchema } from "@shared/conversations/contracts";

export const mcpActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list") }).strict(),
  z.object({ kind: z.literal("refresh") }).strict(),
  z.object({ kind: z.literal("login"), serverName: z.string().min(1).max(512) }).strict()
]);
export const mcpRequestSchema = z.object({ schemaVersion: z.literal(1), environmentId: z.string().min(1).max(512),
  providerKind: z.enum(["claude", "codex"]), instanceId: z.string().min(1).max(512),
  /** Omitted to discover only servers configured outside any workspace (user, plugin or managed config). */
  workspace: workspaceRefSchema.optional(), action: mcpActionSchema }).strict();
export const mcpToolSchema = z.object({ name: z.string(), description: z.string().optional() }).strict();
export const mcpServerSchema = z.object({ name: z.string(),
  status: z.enum(["connected", "pending", "needs-auth", "failed", "disabled", "unknown"]),
  authStatus: z.enum(["authenticated", "needs-auth", "unsupported", "unknown"]),
  /** Where the server is configured: global (user, plugin, managed or built-in) or the workspace's project config. */
  scope: z.enum(["global", "workspace", "unknown"]),
  canLogin: z.boolean(), tools: z.array(mcpToolSchema), message: z.string().optional() }).strict();
export const mcpResultSchema = z.discriminatedUnion("kind", [
  /** `notice` explains servers the runtime could not include, such as account connectors it is not signed in to load. */
  z.object({ kind: z.literal("servers"), servers: z.array(mcpServerSchema), notice: z.string().optional() }).strict(),
  z.object({ kind: z.literal("login"), authorizationUrl: z.url().refine((value) => ["https:", "http:"].includes(new URL(value).protocol)) }).strict(),
  z.object({ kind: z.literal("unavailable"), message: z.string() }).strict()
]);
