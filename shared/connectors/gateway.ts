import { z } from "zod";
import { connectorAccessSchema, connectorIdSchema, connectorInputSchema, connectorListSchema } from "./contracts";

export const connectorsChannel = "connectors:request";
/** Pushed with the full list whenever a connector's configuration or status changes, including sign-ins finishing in the browser. */
export const connectorsChangedChannel = "connectors:changed";

/** Every reply carries the whole list, so the window always shows the stored truth. */
export const connectorRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list") }).strict(),
  z.object({ kind: z.literal("create"), connector: connectorInputSchema }).strict(),
  z.object({ kind: z.literal("set-enabled"), id: connectorIdSchema, enabled: z.boolean() }).strict(),
  z.object({ kind: z.literal("set-access"), id: connectorIdSchema, access: connectorAccessSchema }).strict(),
  z.object({ kind: z.literal("remove"), id: connectorIdSchema }).strict(),
  /** Opens the server's OAuth sign-in in the browser and resolves once it completes, fails or times out. */
  z.object({ kind: z.literal("sign-in"), id: connectorIdSchema }).strict(),
  z.object({ kind: z.literal("sign-out"), id: connectorIdSchema }).strict(),
  /** Reconnects to re-check status and tools: one connector, or every enabled one when `id` is omitted. */
  z.object({ kind: z.literal("refresh"), id: connectorIdSchema.optional() }).strict()
]);
export const connectorReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), connectors: connectorListSchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
