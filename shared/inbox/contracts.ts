import { z } from "zod";
import { conversationSchema, requestSchema, runSchema } from "@shared/conversations/contracts";
import { connectorIdSchema } from "@shared/connectors/contracts";
import { attentionNoticeSchema } from "@shared/conversations/attention";

/**
 * The inbox: everything across every workspace that is waiting on the user (approvals, questions, paused workflows, connectors
 * that need signing in) and the updates they have not dealt with yet (finished threads and workflows). Items are derived from
 * their sources each time; only the user's read, done and snooze marks are stored.
 */
const id = z.string().min(1).max(512);
const time = z.string().datetime();

export const INBOX_PREVIEW_MAX = 280;

const itemBase = {
  id,
  /** The native workspace the item belongs to; null when it is not tied to one, such as a connector. */
  workspaceId: id.nullable(),
  occurredAt: time,
  /** Requests and other needs-you items stay unread until resolved; updates become read once seen. */
  readAt: time.nullable(),
  snoozedUntil: time.nullable()
};

export const inboxRequestItemSchema = z.object({ ...itemBase, kind: z.literal("request"), conversation: conversationSchema,
  request: requestSchema, notice: attentionNoticeSchema }).strict();
/** The latest finished run of a top-level thread; delegated child threads roll up into the thread that asked. */
export const inboxOutcomeItemSchema = z.object({ ...itemBase, kind: z.literal("outcome"), conversation: conversationSchema,
  run: runSchema.pick({ id: true, state: true, createdAt: true, updatedAt: true, failure: true }),
  /** The last thing the agent said in that run, trimmed for a list row. */
  preview: z.string().max(INBOX_PREVIEW_MAX).nullable() }).strict();
export const inboxWorkflowItemSchema = z.object({ ...itemBase, kind: z.literal("workflow"),
  /** The shell project the workflow ran in, which the Workflows tool opens. */
  projectId: id, runId: id, workflowName: z.string().min(1), objective: z.string(),
  status: z.enum(["paused", "completed"]), stopReason: z.string().nullable() }).strict();
export const inboxConnectorItemSchema = z.object({ ...itemBase, kind: z.literal("connector"), connectorId: connectorIdSchema,
  name: z.string().min(1) }).strict();
/** An app's alert: a condition over one of its sources that is true now, with the text it rendered from the rows. */
export const inboxAlertItemSchema = z.object({ ...itemBase, kind: z.literal("alert"), appId: id, appName: z.string().min(1), alertId: id,
  title: z.string().min(1), detail: z.string().nullable(), tier: z.enum(["needs-you", "update"]) }).strict();
export const inboxItemSchema = z.discriminatedUnion("kind", [inboxRequestItemSchema, inboxOutcomeItemSchema, inboxWorkflowItemSchema, inboxConnectorItemSchema, inboxAlertItemSchema]);
/** Item kinds older clients know; newer ones are left out of what Nora Remote serves until the mobile app learns them. */
export const REMOTE_INBOX_ITEM_KINDS: ReadonlySet<string> = new Set(["request", "outcome", "workflow", "connector"]);
export const inboxSnapshotSchema = z.object({ items: z.array(inboxItemSchema) }).strict();

/** What opening an item shows: its thread, the workflow run's monitor, or connector settings. */
export const inboxTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("thread"), conversationId: id }).strict(),
  z.object({ kind: z.literal("workflow"), projectId: id, runId: id }).strict(),
  z.object({ kind: z.literal("connectors") }).strict(),
  z.object({ kind: z.literal("app"), appId: id }).strict(),
  /** The inbox itself, e.g. from the notch island's inbox button. */
  z.object({ kind: z.literal("inbox") }).strict()
]);

export const SNOOZE_MAX_MS = 30 * 24 * 60 * 60 * 1000;
/** Changes the user makes to items. Needs-you items cannot be marked done: they leave once they are resolved. */
export const inboxCommandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mark-read"), itemIds: z.array(id).min(1).max(500) }).strict(),
  z.object({ kind: z.literal("mark-unread"), itemIds: z.array(id).min(1).max(500) }).strict(),
  /** Reads every update about a thread, for example once its view is on screen. */
  z.object({ kind: z.literal("mark-thread-read"), conversationId: id }).strict(),
  z.object({ kind: z.literal("mark-done"), itemIds: z.array(id).min(1).max(500) }).strict(),
  z.object({ kind: z.literal("snooze"), itemIds: z.array(id).min(1).max(500), until: time }).strict(),
  z.object({ kind: z.literal("unsnooze"), itemIds: z.array(id).min(1).max(500) }).strict()
]);

/** Stored marks, keyed by item id. Updates that finished before the inbox first started are treated as already done. */
export const inboxMarkSchema = z.object({ readAt: time.optional(), doneAt: time.optional(), snoozedUntil: time.optional() }).strict();
export const inboxLedgerSchema = z.object({ version: z.literal(1), baselineAt: time, marks: z.record(id, inboxMarkSchema) }).strict();
