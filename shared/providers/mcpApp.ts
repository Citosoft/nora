import { z } from "zod";
import { mcpAppToolResultSchema } from "@shared/conversations/mcpApp";

const id = z.string().min(1).max(512);
/** Device features a widget asked for (MCP Apps `ui.permissions`); each maps to an iframe `allow` feature. */
export const mcpAppPermissionsSchema = z.object({
  camera: z.object({}).optional(), microphone: z.object({}).optional(),
  geolocation: z.object({}).optional(), clipboardWrite: z.object({}).optional()
}).strict();
/**
 * What a widget may ask of its host. The renderer names the tool item only; the host derives the server,
 * resource and permitted tools from that item, so a widget never chooses which server it reaches.
 */
export const mcpAppActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("open") }).strict(),
  z.object({ kind: z.literal("call-tool"), tool: z.string().min(1).max(512), arguments: z.record(z.string(), z.json()) }).strict()
]);
export const mcpAppRequestSchema = z.object({ schemaVersion: z.literal(1), environmentId: id, conversationId: id, itemId: id,
  action: mcpAppActionSchema }).strict();
export const mcpAppResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("frame"),
    /** A sandboxed, single-use origin serving the widget with its own Content-Security-Policy. */
    frameUrl: z.url(),
    permissions: mcpAppPermissionsSchema,
    prefersBorder: z.boolean().optional(),
    /** Whether the runtime can run tool calls the widget makes. */
    toolCalls: z.boolean() }).strict(),
  z.object({ kind: z.literal("tool-result"), result: mcpAppToolResultSchema }).strict(),
  z.object({ kind: z.literal("unavailable"), message: z.string() }).strict()
]);
