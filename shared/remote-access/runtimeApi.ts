import { z } from "zod";
import { botAvatarSchema, botIdSchema, BOT_NAME_MAX, BOT_ROLE_MAX } from "@shared/bots/contracts";
import { commandReceiptSchema, conversationEventSchema, providerBindingSchema, requestResponseSchema, runSchema } from "@shared/conversations/contracts";
import { conversationSummarySchema, eventPageSchema, headerSchema, timelinePageSchema } from "@shared/conversations/gateway";
import { REMOTE_LIMITS } from "./constants";
import { inboxCommandSchema, inboxSnapshotSchema } from "@shared/inbox/contracts";
import { runtimeEnvironmentSchema, runtimeNameSchema } from "./directory";

/**
 * Versioned `/v1` runtime API served by a user-owned Nora runtime behind its tunnel. Shared by the desktop host, a future
 * headless host and the web/mobile client. Conversation payloads reuse the conversation gateway's own schemas.
 */
const id = z.string().min(1).max(512);
const cursor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const RUNTIME_CAPABILITIES = ["conversations.read", "conversations.create", "messages.send", "actions.decide",
  "tasks.cancel", "tasks.list", "events.replay", "realtime", "bots.chat", "inbox.read", "inbox.update"] as const;
/** Unknown capabilities from newer runtimes are tolerated by clients; they only act on the ones they know. */
export const runtimeCapabilitySchema = z.string().min(1).max(64);

export const anonymousRuntimeInfoSchema = z.object({ apiVersion: z.number().int().positive() }).strict();
export const runtimeInfoSchema = z.object({
  apiVersion: z.number().int().positive(),
  runtimeVersion: z.string().min(1).max(64),
  name: runtimeNameSchema,
  environment: runtimeEnvironmentSchema,
  environmentId: id,
  capabilities: z.array(runtimeCapabilitySchema).max(64),
  cursor
}).strict();

export const remoteProjectSchema = z.object({ id, name: z.string().min(1), kind: z.enum(["personal", "folder", "repository"]) }).strict();
export const projectsResponseSchema = z.object({ projects: z.array(remoteProjectSchema) }).strict();
/** Which of the bot's chats this is: a global bot has one chat for every workspace, a workspace bot one per workspace. */
export const remoteBotScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("global") }).strict(),
  z.object({ kind: z.literal("workspace"), workspaceId: id }).strict()
]);
/** A bot the user can chat with from a remote client; the working workspace is chosen by the runtime, never by the client. */
export const remoteBotSchema = z.object({
  id: botIdSchema,
  name: z.string().min(1).max(BOT_NAME_MAX),
  role: z.string().max(BOT_ROLE_MAX),
  avatar: botAvatarSchema,
  scope: remoteBotScopeSchema,
  /** The bot's existing direct chat, or null until the first message starts one. */
  chatConversationId: id.nullable()
}).strict();
export const botsResponseSchema = z.object({ bots: z.array(remoteBotSchema) }).strict();
export const conversationsResponseSchema = z.object({ conversations: z.array(conversationSummarySchema) }).strict();
export const conversationDetailResponseSchema = z.object({ header: headerSchema, timeline: timelinePageSchema }).strict();
export const timelineResponseSchema = z.object({ page: timelinePageSchema }).strict();

export const createConversationRequestSchema = z.object({
  commandId: id, conversationId: id, projectId: id, title: z.string().trim().min(1).max(200),
  /** Omitted: the runtime resolves the same default model binding the desktop uses for a new thread. */
  provider: providerBindingSchema.optional()
}).strict();
/** Body for `POST /v1/bots/:botId/chat`; the runtime resolves the bot's home workspace, provider and title. */
export const createBotChatRequestSchema = z.object({ commandId: id, conversationId: id, scope: remoteBotScopeSchema }).strict();
export const sendMessageRequestSchema = z.object({ commandId: id, runId: id, instruction: z.string().trim().min(1).max(100_000) }).strict();
export const actionDecisionRequestSchema = z.object({ commandId: id, conversationId: id, response: requestResponseSchema }).strict();
export const cancelTaskRequestSchema = z.object({ commandId: id, conversationId: id }).strict();
export const commandResponseSchema = z.object({ receipt: commandReceiptSchema }).strict();

export const remoteTaskSchema = z.object({
  conversationId: id,
  conversationTitle: z.string().min(1),
  projectId: id,
  run: runSchema.pick({ id: true, state: true, createdAt: true, updatedAt: true, failure: true }),
  /** The user's words for the run, truncated for list display. */
  label: z.string().max(240),
  pendingRequestCount: cursor
}).strict();
export const tasksResponseSchema = z.object({ tasks: z.array(remoteTaskSchema) }).strict();
export const eventsResponseSchema = eventPageSchema;
/** The same inbox the desktop shows, built on the runtime; clients answer requests through `/v1/actions/:id/decision`. */
export const inboxResponseSchema = inboxSnapshotSchema;
export const inboxCommandRequestSchema = z.object({ command: inboxCommandSchema }).strict();
export const realtimeTicketResponseSchema = z.object({ ticket: z.string().min(32).max(128), expiresAt: z.string().datetime() }).strict();

export const runtimeApiErrorCodeSchema = z.enum(["unauthenticated", "forbidden", "not-found", "invalid", "conflict", "expired",
  "cursor-unavailable", "unavailable", "rate-limited", "too-large"]);
export const runtimeApiErrorSchema = z.object({ error: z.object({ code: runtimeApiErrorCodeSchema, message: z.string().min(1).max(500) }).strict() }).strict();

export const eventsQuerySchema = z.object({
  after: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  conversationId: id.optional(),
  limit: z.coerce.number().int().min(1).max(REMOTE_LIMITS.eventPageLimit).optional()
}).strict();
export const timelineQuerySchema = z.object({
  before: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  limit: z.coerce.number().int().min(1).max(REMOTE_LIMITS.timelinePageLimit).optional()
}).strict();
export const conversationsQuerySchema = z.object({ projectId: id.optional(), settled: z.enum(["true", "false"]).optional() }).strict();

/** Realtime socket protocol (`/v1/realtime?ticket=`); every message is one JSON object discriminated by `type`. */
export const realtimeClientMessageSchema = z.discriminatedUnion("type", [
  /** Starts (or replaces) the socket's subscription after `after`; optionally one conversation only. */
  z.object({ type: z.literal("subscribe"), after: cursor, conversationId: id.optional() }).strict(),
  /** Re-authenticates with a fresh single-use ticket before `authExpiresAt`. */
  z.object({ type: z.literal("auth"), ticket: z.string().min(32).max(128) }).strict(),
  z.object({ type: z.literal("ping") }).strict()
]);
export const realtimeServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready"), cursor, authExpiresAt: z.string().datetime() }).strict(),
  z.object({ type: z.literal("authenticated"), authExpiresAt: z.string().datetime() }).strict(),
  z.object({ type: z.literal("event"), event: conversationEventSchema }).strict(),
  /** The stream cannot continue in order (backpressure or an unknown cursor); catch up from `cursor` over `GET /v1/events`. */
  z.object({ type: z.literal("resync"), cursor }).strict(),
  z.object({ type: z.literal("pong") }).strict(),
  z.object({ type: z.literal("error"), code: runtimeApiErrorCodeSchema, message: z.string().min(1).max(500) }).strict()
]);

export const RUNTIME_ROUTES = Object.freeze({
  info: "/v1/runtime/info",
  projects: "/v1/projects",
  bots: "/v1/bots",
  botChat: (botId: string) => `/v1/bots/${encodeURIComponent(botId)}/chat`,
  conversations: "/v1/conversations",
  conversation: (conversationId: string) => `/v1/conversations/${encodeURIComponent(conversationId)}`,
  timeline: (conversationId: string) => `/v1/conversations/${encodeURIComponent(conversationId)}/timeline`,
  messages: (conversationId: string) => `/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
  decision: (requestId: string) => `/v1/actions/${encodeURIComponent(requestId)}/decision`,
  cancel: (runId: string) => `/v1/tasks/${encodeURIComponent(runId)}/cancel`,
  tasks: "/v1/tasks",
  inbox: "/v1/inbox",
  events: "/v1/events",
  ticket: "/v1/realtime/ticket",
  realtime: "/v1/realtime"
});
