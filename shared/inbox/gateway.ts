import { z } from "zod";
import { inboxCommandSchema, inboxSnapshotSchema, inboxTargetSchema } from "./contracts";

export const inboxChannel = "inbox:request";
/** Pushed with the whole snapshot whenever an item appears, changes or leaves. */
export const inboxChangedChannel = "inbox:changed";
/** Main → window: show an item's target, e.g. after the user clicks an inbox notification. */
export const inboxOpenChannel = "inbox:open";

export const inboxRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list") }).strict(),
  z.object({ kind: z.literal("command"), command: inboxCommandSchema }).strict()
]);
export const inboxReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), snapshot: inboxSnapshotSchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
export const inboxOpenSchema = inboxTargetSchema;
