import { z } from "zod";

const id = z.string().min(1).max(512);
const time = z.string().datetime();
export const providerBindingSchema = z.object({
  kind: z.enum(["claude", "codex"]),
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
  access: z.enum(["read", "write"])
}).strict();
export const failureSchema = z.object({
  code: z.enum(["authentication", "usage-limit", "provider", "host", "disconnected", "uncertain", "unsupported"]),
  message: z.string().min(1),
  retryable: z.boolean()
}).strict();
export const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative()
}).strict();
export const conversationSchema = z.object({
  id,
  title: z.string().min(1),
  workspace: workspaceRefSchema,
  provider: providerBindingSchema,
  parentId: id.nullable(),
  nativeConversationId: id.nullable(),
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
  failure: failureSchema.nullable(),
  usage: usageSchema.nullable(),
  review: z.enum(["pending", "ready", "unavailable"])
}).strict();
const itemBase = { id, runId: id, createdAt: time };
export const timelineItemSchema = z.discriminatedUnion("kind", [
  z.object({ ...itemBase, kind: z.literal("message"), role: z.enum(["user", "assistant"]), text: z.string(), complete: z.boolean() }).strict(),
  z.object({ ...itemBase, kind: z.literal("reasoning"), text: z.string(), complete: z.boolean() }).strict(),
  z.object({ ...itemBase, kind: z.literal("tool"), label: z.string(), output: z.string(), state: z.enum(["running", "completed", "failed"]) }).strict(),
  z.object({ ...itemBase, kind: z.literal("milestone"), text: z.string() }).strict(),
  z.object({ ...itemBase, kind: z.literal("plan"), steps: z.array(z.object({ text: z.string(), state: z.enum(["pending", "running", "completed"]) }).strict()) }).strict(),
  z.object({ ...itemBase, kind: z.literal("subagent"), label: z.string(), nativeId: id, state: z.enum(["running", "completed", "failed"]) }).strict(),
  z.object({ ...itemBase, kind: z.literal("changes"), paths: z.array(z.string()), attribution: z.enum(["turn", "workspace"]) }).strict()
]);
const requestBase = {
  id, runId: id, attemptId: id, nativeId: id,
  status: z.enum(["pending", "responding", "resolved", "expired"]),
  createdAt: time, expiresAt: time,
  title: z.string().min(1)
};
export const requestSchema = z.discriminatedUnion("kind", [
  z.object({ ...requestBase, kind: z.literal("approval"), options: z.array(z.object({ id, label: z.string().min(1) }).strict()).min(1) }).strict(),
  z.object({ ...requestBase, kind: z.literal("question"), questions: z.array(z.object({ id, text: z.string(), options: z.array(z.string()), multiple: z.boolean() }).strict()).min(1) }).strict()
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
export const conversationCommandSchema = z.discriminatedUnion("kind", [
  z.object({ ...commandBase, kind: z.literal("create"), title: z.string().trim().min(1), workspace: workspaceRefSchema, provider: providerBindingSchema, parentId: id.nullable() }).strict(),
  z.object({ ...commandBase, kind: z.literal("submit"), runId: id, instruction: z.string().trim().min(1) }).strict(),
  z.object({ ...commandBase, kind: z.literal("edit-queued"), runId: id, instruction: z.string().trim().min(1) }).strict(),
  z.object({ ...commandBase, kind: z.literal("remove-queued"), runId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal("continue-queue") }).strict(),
  z.object({ ...commandBase, kind: z.literal("interrupt"), runId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal("reconcile"), runId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal("respond"), requestId: id, response: requestResponseSchema }).strict(),
  z.object({ ...commandBase, kind: z.literal("archive") }).strict()
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
