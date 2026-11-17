import { z } from "zod";
import { runtimeNameSchema } from "./directory";

/** Desktop window ↔ main contract for the Remote access settings group. */
export const remoteAccessChannel = "remote-access:request";
/** Main → window: pushed with the full view whenever remote access status changes. */
export const remoteAccessChangedChannel = "remote-access:changed";

export const remoteAccessStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("disabled") }).strict(),
  z.object({ status: z.literal("downloading"), progress: z.number().min(0).max(1).nullable() }).strict(),
  z.object({ status: z.literal("starting") }).strict(),
  z.object({ status: z.literal("connected") }).strict(),
  z.object({ status: z.literal("reconnecting"), message: z.string().min(1) }).strict(),
  /** Enabled, but the signed-in account is not the runtime's owner (or nobody is signed in); the registration is kept. */
  z.object({ status: z.literal("paused"), reason: z.enum(["signed-out", "different-account"]) }).strict(),
  z.object({ status: z.literal("error"), message: z.string().min(1), retryable: z.boolean() }).strict()
]);
export const remoteAccessViewSchema = z.object({
  /** Whether a Nora account is signed in on this computer; remote access requires it. */
  signedIn: z.boolean(),
  enabled: z.boolean(),
  status: remoteAccessStatusSchema,
  runtime: z.object({ installationId: z.string().min(1), name: runtimeNameSchema, hostname: z.string().nullable() }).strict().nullable(),
  /** Where to open Nora on a phone; a convenience link that grants nothing by itself. */
  webAppUrl: z.string().url(),
  /** A previous disable could not reach the control plane; cleanup is retried on the next start or sign-in. */
  pendingCleanup: z.boolean()
}).strict();
export const remoteAuditEntrySchema = z.object({
  at: z.string().datetime(),
  action: z.enum(["create-conversation", "send-message", "decide-action", "cancel-task"]),
  conversationId: z.string().min(1).nullable(),
  targetId: z.string().min(1).nullable(),
  outcome: z.enum(["accepted", "rejected"]),
  /** Error code when rejected. */
  code: z.string().max(64).nullable(),
  /** Clerk user and session that issued the command; never the instruction text. */
  userId: z.string().min(1),
  sessionId: z.string().nullable()
}).strict();

export const remoteAccessRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("view") }).strict(),
  z.object({ kind: z.literal("enable") }).strict(),
  z.object({ kind: z.literal("disable") }).strict(),
  z.object({ kind: z.literal("retry") }).strict(),
  z.object({ kind: z.literal("rename"), name: runtimeNameSchema }).strict(),
  /** Replaces the tunnel's connector credentials and drops existing connections. */
  z.object({ kind: z.literal("rotate") }).strict(),
  z.object({ kind: z.literal("activity"), limit: z.number().int().min(1).max(200).optional() }).strict()
]);
export const remoteAccessReplySchema = z.union([
  z.object({ ok: z.literal(true), view: remoteAccessViewSchema }).strict(),
  z.object({ ok: z.literal(true), activity: z.array(remoteAuditEntrySchema) }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
