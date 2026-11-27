import { z } from "zod";
import { providerKindSchema } from "@shared/providers/providerKinds";
import { backgroundTaskSchema, commandReceiptSchema, contextUsageSchema, conversationCommandSchema, conversationEventSchema, conversationSchema,
  requestSchema, runSchema, timelineItemSchema, workspaceRefSchema } from "./contracts";
import { mcpResultSchema } from "@shared/providers/mcp";
import { mcpAppResultSchema } from "@shared/providers/mcpApp";
import { providerAccountResultSchema } from "@shared/providers/account";
import { skillsResultSchema } from "@shared/providers/skills";
import { catalogResultSchema } from "./catalog";
import { externalSessionsResultSchema } from "./externalSessions";
import { threadReferenceSchema } from "./references";

const id = z.string().min(1).max(512);
const cursor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const pageLimit = z.number().int().min(1).max(200).optional();
const routed = { schemaVersion: z.literal(1), environmentId: id };
export const executeRequestSchema = z.object({ ...routed, command: conversationCommandSchema }).strict();
export const readRequestSchema = z.discriminatedUnion("kind", [
  z.object({ ...routed, kind: z.literal("external-sessions"), providerKind: providerKindSchema, instanceId: id, workspace: workspaceRefSchema }).strict(),
  z.object({ ...routed, kind: z.literal("header"), conversationId: id }).strict(),
  z.object({ ...routed, kind: z.literal("thread-reference"), conversationId: id }).strict(),
  /** Measures native context for a thread with no reading yet, from the runtime's saved history. */
  z.object({ ...routed, kind: z.literal("context"), conversationId: id }).strict(),
  z.object({ ...routed, kind: z.literal("summaries"), projectId: id.optional() }).strict(),
  z.object({ ...routed, kind: z.literal("history"), conversationId: id, scope: z.enum(["timeline", "runs"]),
    before: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(), limit: pageLimit }).strict(),
  z.object({ ...routed, kind: z.literal("events"), conversationId: id.optional(), after: cursor, limit: pageLimit }).strict(),
  z.object({ ...routed, kind: z.literal("catalog"), providerKind: providerKindSchema, instanceId: id, workspace: workspaceRefSchema }).strict(),
  /** The owning host reads `path` only when that item recorded it as an output: a tool call's file or a reviewed turn's change. */
  z.object({ ...routed, kind: z.literal("output-file"), conversationId: id, itemId: id, path: z.string().min(1).max(32_768),
    size: z.enum(["thumbnail", "preview"]) }).strict(),
  /** Every thread in a workspace's project, with only the items that can carry outputs. */
  z.object({ ...routed, kind: z.literal("outputs"), projectId: id }).strict()
]);
/** Opens an item's output file on the owning host, only when that item recorded it. */
export const outputRequestSchema = z.object({ ...routed, conversationId: id, itemId: id, path: z.string().min(1).max(32_768) }).strict();
export const watchRequestSchema = z.object({ ...routed, watchId: id, conversationId: id.optional() }).strict();
export const unwatchRequestSchema = z.object({ ...routed, watchId: id }).strict();
export const cursorHintSchema = z.object({ ...routed, watchId: id, cursor }).strict();
export const watchReceiptSchema = z.object({ watchId: id, cursor }).strict();
export const headerSchema = z.object({ schemaVersion: z.literal(1), cursor, conversation: conversationSchema,
  activeRuns: z.array(runSchema), queuedRuns: z.array(runSchema), pendingRequests: z.array(requestSchema),
  backgroundTasks: z.array(backgroundTaskSchema).default([]) }).strict();
export const conversationSummarySchema = z.object({ conversation: conversationSchema,
  latestRun: runSchema.pick({ id: true, state: true, createdAt: true, updatedAt: true, failure: true }).nullable(),
  queuedCount: cursor, pendingRequestCount: cursor }).strict();
const historyBase = { schemaVersion: z.literal(1), conversationId: id, cursor, nextBefore: z.number().int().positive().nullable() };
export const timelinePageSchema = z.object({ ...historyBase, scope: z.literal("timeline"), items: z.array(timelineItemSchema).max(200) }).strict();
const historySchema = z.discriminatedUnion("scope", [
  timelinePageSchema,
  z.object({ ...historyBase, scope: z.literal("runs"), runs: z.array(runSchema).max(200) }).strict()
]);
export const eventPageSchema = z.object({ schemaVersion: z.literal(1), after: cursor, nextCursor: cursor,
  events: z.array(conversationEventSchema).max(200) }).strict();
/** A bounded, re-encoded preview, so the original file's bytes never cross the boundary. */
export const toolImagePreviewSchema = z.object({ dataUrl: z.string().startsWith("data:image/webp;base64,"),
  width: z.number().int().positive(), height: z.number().int().positive() }).strict();
/** The most text an output file may return for display; larger files open with the operating system. */
export const OUTPUT_FILE_TEXT_MAX_BYTES = 1024 * 1024;
/** How an output file can be shown: a bounded image preview, its text, or only by the operating system. */
export const outputFileContentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("image"), preview: toolImagePreviewSchema }).strict(),
  z.object({ kind: z.literal("text"), text: z.string().max(OUTPUT_FILE_TEXT_MAX_BYTES) }).strict(),
  z.object({ kind: z.literal("unsupported") }).strict()
]);
/** Bounds one outputs read: the newest output-bearing items across the workspace. */
export const OUTPUT_ITEMS_MAX = 5000;
/**
 * One thread's output-bearing items: tool calls that recorded output files and reviewed turns, trimmed to what output
 * derivation reads (no patches, tool output text or unrelated details).
 */
export const outputThreadSchema = z.object({ conversationId: id, title: z.string(), workspacePath: z.string(), updatedAt: z.string(),
  archived: z.boolean(), items: z.array(timelineItemSchema).max(OUTPUT_ITEMS_MAX) }).strict();
export const readResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("external-sessions"), result: externalSessionsResultSchema }).strict(),
  z.object({ kind: z.literal("header"), header: headerSchema.nullable() }).strict(),
  z.object({ kind: z.literal("thread-reference"), reference: threadReferenceSchema }).strict(),
  z.object({ kind: z.literal("context"), context: contextUsageSchema.nullable() }).strict(),
  z.object({ kind: z.literal("summaries"), summaries: z.array(conversationSummarySchema) }).strict(),
  z.object({ kind: z.literal("history"), page: historySchema }).strict(),
  z.object({ kind: z.literal("events"), page: eventPageSchema }).strict(),
  z.object({ kind: z.literal("catalog"), result: catalogResultSchema }).strict(),
  z.object({ kind: z.literal("output-file"), file: outputFileContentSchema.nullable() }).strict(),
  z.object({ kind: z.literal("outputs"), threads: z.array(outputThreadSchema).max(OUTPUT_ITEMS_MAX) }).strict()
]);
export const gatewayErrorSchema = z.object({ code: z.enum(["missing", "conflict", "expired", "invalid", "cursor", "environment", "unavailable"]),
  message: z.string().min(1) }).strict();
export const gatewayReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value: z.discriminatedUnion("kind", [
    ...readResultSchema.options,
    z.object({ kind: z.literal("mcp"), result: mcpResultSchema }).strict(),
    z.object({ kind: z.literal("mcp-app"), result: mcpAppResultSchema }).strict(),
    z.object({ kind: z.literal("account"), result: providerAccountResultSchema }).strict(),
    z.object({ kind: z.literal("skills"), result: skillsResultSchema }).strict(),
    z.object({ kind: z.literal("receipt"), receipt: commandReceiptSchema }).strict(),
    z.object({ kind: z.literal("watch"), receipt: watchReceiptSchema }).strict(),
    z.object({ kind: z.literal("unwatched") }).strict(),
    z.object({ kind: z.literal("output-opened") }).strict()
  ]) }).strict(),
  z.object({ ok: z.literal(false), error: gatewayErrorSchema }).strict()
]);
export const conversationChannels = Object.freeze({ execute: "conversation:execute", read: "conversation:read", mcp: "provider:mcp", mcpApp: "provider:mcp-app", account: "provider:account", skills: "provider:skills",
  watch: "conversation:watch", unwatch: "conversation:unwatch", cursor: "conversation:cursor", output: "conversation:output" });
