import { z } from "zod";
import { providerKindSchema } from "./providerKinds";
import { workspaceRefSchema } from "@shared/conversations/contracts";

export const mcpActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list") }).strict(),
  z.object({ kind: z.literal("refresh") }).strict(),
  z.object({ kind: z.literal("login"), serverName: z.string().min(1).max(512) }).strict()
]);
export const mcpRequestSchema = z.object({ schemaVersion: z.literal(1), environmentId: z.string().min(1).max(512),
  providerKind: providerKindSchema, instanceId: z.string().min(1).max(512),
  /** Omitted to discover only servers configured outside any workspace (user, plugin or managed config). */
  workspace: workspaceRefSchema.optional(), action: mcpActionSchema }).strict();
const httpsUrlSchema = z.url().refine((value) => new URL(value).protocol === "https:");
/** Where to draw a server's logo from: icons it advertises, or a domain whose favicon represents it. */
export const mcpServerLogoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("icon"), lightUrl: httpsUrlSchema, darkUrl: httpsUrlSchema }).strict(),
  z.object({ kind: z.literal("domain"), domain: z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/) }).strict()
]);
export const mcpToolSchema = z.object({ name: z.string(), description: z.string().optional() }).strict();
export const mcpServerSchema = z.object({ name: z.string(),
  status: z.enum(["connected", "pending", "needs-auth", "failed", "disabled", "unknown"]),
  authStatus: z.enum(["authenticated", "needs-auth", "unsupported", "unknown"]),
  /** Where the server is configured: global (user, plugin, managed or built-in) or the workspace's project config. */
  scope: z.enum(["global", "workspace", "unknown"]),
  /** Set for connectors offered by the provider account: `available` ones were never connected by the user and are not usable. */
  accountConnector: z.enum(["connected", "available"]).optional(),
  logo: mcpServerLogoSchema.optional(),
  canLogin: z.boolean(), tools: z.array(mcpToolSchema), message: z.string().optional() }).strict();
export const mcpResultSchema = z.discriminatedUnion("kind", [
  /** `notice` explains servers the runtime could not include, such as account connectors it is not signed in to load. */
  z.object({ kind: z.literal("servers"), servers: z.array(mcpServerSchema), notice: z.string().optional() }).strict(),
  z.object({ kind: z.literal("login"), authorizationUrl: z.url().refine((value) => ["https:", "http:"].includes(new URL(value).protocol)) }).strict(),
  z.object({ kind: z.literal("unavailable"), message: z.string() }).strict()
]);
