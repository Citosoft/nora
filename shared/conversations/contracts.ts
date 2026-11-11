import { externalSessionOriginSchema } from "./externalSessions";
import { z } from "zod";
import { providerKindSchema } from "@shared/providers/providerKinds";
import { conversationReviewSchema } from "./review";
import { roleSelectionSchema, roleSnapshotSchema } from "@shared/personalization/contracts";

const id = z.string().min(1).max(512);
const time = z.string().datetime();
export const promptSuggestionSchema = z.string().trim().min(1).max(4000);
export const providerBindingSchema = z.object({
  kind: providerKindSchema,
  instanceId: id,
  model: id,
  reasoning: z.string().nullable(),
  permissionPolicy: id
}).strict();
export const workspaceRefSchema = z.object({
  projectId: id,
  environmentId: id,
  checkoutId: id,
  path: z.string().min(1),
  branch: z.string(),
  versionControl: z.enum(["git", "none"]).optional(),
  access: z.enum(["read", "write"])
}).strict();
export const failureSchema = z.object({
  code: z.enum(["authentication", "usage-limit", "provider", "host", "disconnected", "uncertain", "unsupported"]),
  message: z.string().min(1),
  retryable: z.boolean(),
  resetsAt: z.string().datetime().optional()
}).strict();
export const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative()
}).strict();
export const conversationSourceSchema = z.object({ kind: z.literal("task"), projectId: id, path: z.string().min(1) }).strict();
export const conversationSchema = z.object({
  id,
  origin: externalSessionOriginSchema.optional(),
  source: conversationSourceSchema.optional(),
  role: roleSnapshotSchema.nullable().optional(),
  title: z.string().min(1),
  workspace: workspaceRefSchema,
  provider: providerBindingSchema,
  parentId: id.nullable(),
  nativeConversationId: id.nullable(),
  // Settled threads retain the existing persisted archive field so their saved history needs no migration.
  archivedAt: time.nullable(),
  createdAt: time,
  updatedAt: time,
  queuePaused: z.boolean()
}).strict();
export const runSchema = z.object({
  id,
  conversationId: id,
  instruction: z.string().trim().min(1),
  state: z.enum(["queued", "starting", "running", "awaiting-approval", "awaiting-input", "stopping", "completed", "failed", "interrupted", "recovering"]),
  attemptId: id,
  nativeTurnId: id.nullable(),
  createdAt: time,
  updatedAt: time,
  // Older persisted turns can recover their start from the instruction timeline item.
  startedAt: time.optional(),
  steering: z.enum(["pending", "unconfirmed"]).optional(),
  promptSuggestion: promptSuggestionSchema.optional(),
  failure: failureSchema.nullable(),
  usage: usageSchema.nullable(),
  review: z.enum(["pending", "ready", "unavailable"])
}).strict();
const itemBase = { id, runId: id, createdAt: time };
export const toolStateSchema = z.enum(["running", "completed", "failed", "declined", "interrupted", "unconfirmed"]);
export const toolDetailsSchema = z.object({
  category: z.enum(["command", "integration", "search", "file", "image", "agent", "wait", "other"]),
  input: z.string().optional(), detail: z.string().optional(), parentId: z.string().optional(), patch: z.string().optional(),
  durationMs: z.number().nonnegative().optional(), exitCode: z.number().int().optional()
}).strict();
export const approvalDetailsSchema = z.object({
  kind: z.enum(["command", "files", "network", "tool"]),
  command: z.string().optional(), workingDirectory: z.string().optional(), reason: z.string().optional(),
  paths: z.array(z.string()).optional(), target: z.string().optional(), input: z.string().optional()
}).strict();
export const timelineItemSchema = z.discriminatedUnion("kind", [
  z.object({ ...itemBase, kind: z.literal("message"), role: z.enum(["user", "assistant"]), text: z.string(), complete: z.boolean() }).strict(),
  z.object({ ...itemBase, kind: z.literal("reasoning"), text: z.string(), complete: z.boolean() }).strict(),
  z.object({ ...itemBase, kind: z.literal("tool"), label: z.string(), output: z.string(), state: toolStateSchema, details: toolDetailsSchema.optional() }).strict(),
  z.object({ ...itemBase, kind: z.literal("milestone"), text: z.string() }).strict(),
  z.object({ ...itemBase, kind: z.literal("plan"), steps: z.array(z.object({ text: z.string(), state: z.enum(["pending", "running", "completed"]) }).strict()) }).strict(),
  z.object({ ...itemBase, kind: z.literal("subagent"), label: z.string(), nativeId: id, state: z.enum(["running", "completed", "failed"]) }).strict(),
  z.object({ ...itemBase, kind: z.literal("changes"), paths: z.array(z.string()), patches: z.record(z.string(), z.string().nullable()).optional(), attribution: z.enum(["turn", "workspace"]) }).strict(),
  z.object({ ...itemBase, kind: z.literal("review"), result: conversationReviewSchema }).strict()
]);
const requestBase = {
  id, runId: id, attemptId: id, nativeId: id,
  status: z.enum(["pending", "responding", "resolved", "expired"]),
  createdAt: time, expiresAt: time,
  title: z.string().min(1)
};
export const requestSchema = z.discriminatedUnion("kind", [
  z.object({ ...requestBase, kind: z.literal("approval"), details: approvalDetailsSchema.optional(),
    options: z.array(z.object({ id, label: z.string().min(1), intent: z.enum(["allow", "deny", "cancel"]).optional(),
      scope: z.enum(["once", "session", "persistent"]).optional(), description: z.string().optional() }).strict()).min(1) }).strict(),
  z.object({ ...requestBase, kind: z.literal("question"), questions: z.array(z.object({ id, text: z.string(), options: z.array(z.string()), multiple: z.boolean(), allowOther: z.boolean().optional() }).strict()).min(1) }).strict()
]);
export const requestResponseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("approval"), optionId: id }).strict(),
  z.object({ kind: z.literal("question"), answers: z.record(z.string(), z.array(z.string()).min(1)) }).strict()
]);
export const snapshotSchema = z.object({
  schemaVersion: z.literal(1),
  cursor: z.number().int().nonnegative(),
  conversation: conversationSchema,
  runs: z.array(runSchema),
  items: z.array(timelineItemSchema),
  requests: z.array(requestSchema)
}).strict();

const commandBase = { commandId: id, conversationId: id };
export const createConversationCommandSchema = z.object({ ...commandBase, kind: z.literal("create"), title: z.string().trim().min(1), workspace: workspaceRefSchema, provider: providerBindingSchema, parentId: id.nullable(), role: roleSelectionSchema.optional(), source: conversationSourceSchema.optional(), externalSessionId: id.optional() }).strict();
export const submitConversationCommandSchema = z.object({ ...commandBase, kind: z.literal("submit"), runId: id, instruction: z.string().trim().min(1) }).strict();
export const conversationCommandSchema = z.discriminatedUnion("kind", [
  createConversationCommandSchema,
  submitConversationCommandSchema,
  z.object({ ...commandBase, kind: z.literal("edit-queued"), runId: id, instruction: z.string().trim().min(1) }).strict(),
  z.object({ ...commandBase, kind: z.literal("remove-queued"), runId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal("steer-queued"), runId: id, targetRunId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal("continue-queue") }).strict(),
  z.object({ ...commandBase, kind: z.literal("interrupt"), runId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal("reconcile"), runId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal("respond"), requestId: id, response: requestResponseSchema }).strict(),
  z.object({ ...commandBase, kind: z.literal("archive") }).strict(),
  z.object({ ...commandBase, kind: z.literal("unarchive") }).strict()
]);
export const commandReceiptSchema = z.object({
  commandId: id,
  conversationId: id,
  cursor: z.number().int().nonnegative(),
  acceptedAt: time
}).strict();
export const eventPayloadSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("conversation"), conversation: conversationSchema }).strict(),
  z.object({ kind: z.literal("run"), run: runSchema }).strict(),
  z.object({ kind: z.literal("remove-run"), runId: id }).strict(),
  z.object({ kind: z.literal("item"), item: timelineItemSchema }).strict(),
  z.object({ kind: z.literal("request"), request: requestSchema }).strict()
]);
export const conversationEventSchema = z.object({
  schemaVersion: z.literal(1), id, conversationId: id,
  cursor: z.number().int().positive(), at: time, payload: eventPayloadSchema
}).strict();
