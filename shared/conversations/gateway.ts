import { z } from "zod";
import { providerKindSchema } from "@shared/providers/providerKinds";
import { commandReceiptSchema, conversationCommandSchema, conversationEventSchema, conversationSchema,
  requestSchema, runSchema, timelineItemSchema, workspaceRefSchema } from "./contracts";
import { mcpResultSchema } from "@shared/providers/mcp";
import { providerAccountResultSchema } from "@shared/providers/account";
import { catalogResultSchema } from "./catalog";
import { externalSessionsResultSchema } from "./externalSessions";

const id = z.string().min(1).max(512);
const cursor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const pageLimit = z.number().int().min(1).max(200).optional();
const routed = { schemaVersion: z.literal(1), environmentId: id };
export const executeRequestSchema = z.object({ ...routed, command: conversationCommandSchema }).strict();
export const readRequestSchema = z.discriminatedUnion("kind", [
  z.object({ ...routed, kind: z.literal("external-sessions"), providerKind: providerKindSchema, instanceId: id, workspace: workspaceRefSchema }).strict(),
  z.object({ ...routed, kind: z.literal("header"), conversationId: id }).strict(),
  z.object({ ...routed, kind: z.literal("summaries"), projectId: id.optional() }).strict(),
  z.object({ ...routed, kind: z.literal("history"), conversationId: id, scope: z.enum(["timeline", "runs"]),
    before: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(), limit: pageLimit }).strict(),
  z.object({ ...routed, kind: z.literal("events"), conversationId: id.optional(), after: cursor, limit: pageLimit }).strict(),
  z.object({ ...routed, kind: z.literal("catalog"), providerKind: providerKindSchema, instanceId: id, workspace: workspaceRefSchema }).strict()
]);
export const watchRequestSchema = z.object({ ...routed, watchId: id, conversationId: id.optional() }).strict();
export const unwatchRequestSchema = z.object({ ...routed, watchId: id }).strict();
export const cursorHintSchema = z.object({ ...routed, watchId: id, cursor }).strict();
export const watchReceiptSchema = z.object({ watchId: id, cursor }).strict();
export const headerSchema = z.object({ schemaVersion: z.literal(1), cursor, conversation: conversationSchema,
  activeRuns: z.array(runSchema), queuedRuns: z.array(runSchema), pendingRequests: z.array(requestSchema) }).strict();
const summarySchema = z.object({ conversation: conversationSchema,
  latestRun: runSchema.pick({ id: true, state: true, createdAt: true, updatedAt: true, failure: true }).nullable(),
  queuedCount: cursor, pendingRequestCount: cursor }).strict();
const historyBase = { schemaVersion: z.literal(1), conversationId: id, cursor, nextBefore: z.number().int().positive().nullable() };
const historySchema = z.discriminatedUnion("scope", [
  z.object({ ...historyBase, scope: z.literal("timeline"), items: z.array(timelineItemSchema).max(200) }).strict(),
  z.object({ ...historyBase, scope: z.literal("runs"), runs: z.array(runSchema).max(200) }).strict()
]);
export const eventPageSchema = z.object({ schemaVersion: z.literal(1), after: cursor, nextCursor: cursor,
  events: z.array(conversationEventSchema).max(200) }).strict();
export const readResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("external-sessions"), result: externalSessionsResultSchema }).strict(),
  z.object({ kind: z.literal("header"), header: headerSchema.nullable() }).strict(),
  z.object({ kind: z.literal("summaries"), summaries: z.array(summarySchema) }).strict(),
  z.object({ kind: z.literal("history"), page: historySchema }).strict(),
  z.object({ kind: z.literal("events"), page: eventPageSchema }).strict(),
  z.object({ kind: z.literal("catalog"), result: catalogResultSchema }).strict()
]);
export const gatewayErrorSchema = z.object({ code: z.enum(["missing", "conflict", "expired", "invalid", "cursor", "environment", "unavailable"]),
  message: z.string().min(1) }).strict();
export const gatewayReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value: z.discriminatedUnion("kind", [
    ...readResultSchema.options,
    z.object({ kind: z.literal("mcp"), result: mcpResultSchema }).strict(),
    z.object({ kind: z.literal("account"), result: providerAccountResultSchema }).strict(),
    z.object({ kind: z.literal("receipt"), receipt: commandReceiptSchema }).strict(),
    z.object({ kind: z.literal("watch"), receipt: watchReceiptSchema }).strict(),
    z.object({ kind: z.literal("unwatched") }).strict()
  ]) }).strict(),
  z.object({ ok: z.literal(false), error: gatewayErrorSchema }).strict()
]);
export const conversationChannels = Object.freeze({ execute: "conversation:execute", read: "conversation:read", mcp: "provider:mcp", account: "provider:account",
  watch: "conversation:watch", unwatch: "conversation:unwatch", cursor: "conversation:cursor" });
