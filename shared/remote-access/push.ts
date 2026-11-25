import { z } from "zod";
import { installationIdSchema } from "./directory";

/**
 * Phone push notification contract, shared by the desktop runtime, the control-plane Worker and the mobile app.
 *
 * Phones register their Expo push token with the Worker under the signed-in Clerk user, so every computer on that
 * account can reach them. When a thread finishes or something needs the user, the desktop asks the Worker to send a
 * push; the Worker fans it out to that user's phones through Expo's push service. Keep this file free of Node,
 * Electron and React Native imports, and of heavier shared contracts the Worker should not bundle.
 */
export const PUSH_LIMITS = Object.freeze({
  /** Phones per account. Devices are kept in Clerk private metadata, so this also bounds its size. */
  maxDevicesPerUser: 10,
  maxNotificationsPerRequest: 10,
  titleMaxLength: 120,
  bodyMaxLength: 240
});

/** A random ID the phone generates once and keeps, so re-registering replaces its own entry instead of adding one. */
export const pushDeviceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, "Device IDs are 16-64 URL-safe characters");
export const expoPushTokenSchema = z.string().max(256).regex(/^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/, "Not an Expo push token");
export const pushPlatformSchema = z.enum(["ios", "android"]);

export const registerPushDeviceRequestSchema = z.object({
  deviceId: pushDeviceIdSchema,
  token: expoPushTokenSchema,
  platform: pushPlatformSchema
}).strict();

/** What the Worker keeps per device. The token is stored but never returned to clients. */
export const pushDeviceEntrySchema = z.object({
  deviceId: pushDeviceIdSchema,
  platform: pushPlatformSchema,
  registeredAt: z.string().datetime()
}).strict();
export const pushDeviceResponseSchema = z.object({ device: pushDeviceEntrySchema }).strict();
export const deletePushDeviceResponseSchema = z.object({ deleted: z.literal(true), deviceId: pushDeviceIdSchema }).strict();

/** Why the phone is being told. */
export const pushNoticeKindSchema = z.enum(["finished", "needs-you"]);
/** Where tapping the notification leads on the phone. Targets the phone cannot open (workflows, apps) use `inbox`. */
export const pushTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("thread"), conversationId: z.string().min(1).max(200) }).strict(),
  z.object({ kind: z.literal("inbox") }).strict()
]);

export const pushNotificationSchema = z.object({
  kind: pushNoticeKindSchema,
  /** Stable per event (the inbox item ID), so a retried send can be collapsed by the phone. */
  id: z.string().min(1).max(300),
  title: z.string().trim().min(1).max(PUSH_LIMITS.titleMaxLength),
  body: z.string().max(PUSH_LIMITS.bodyMaxLength),
  target: pushTargetSchema
}).strict();

export const sendPushRequestSchema = z.object({
  /** The computer the events happened on; the phone opens this runtime when the notification is tapped. */
  installationId: installationIdSchema,
  notifications: z.array(pushNotificationSchema).min(1).max(PUSH_LIMITS.maxNotificationsPerRequest)
}).strict();
export const sendPushResponseSchema = z.object({ delivered: z.number().int().min(0) }).strict();

/** The `data` object the Worker attaches to every Expo message, which the phone parses when a notification is tapped. */
export const pushPayloadDataSchema = z.object({
  v: z.literal(1),
  installationId: installationIdSchema,
  kind: pushNoticeKindSchema,
  id: z.string().min(1).max(300),
  target: pushTargetSchema
}).strict();

export const PUSH_ROUTES = Object.freeze({
  devices: "/v1/push/devices",
  device: (deviceId: string) => `/v1/push/devices/${encodeURIComponent(deviceId)}`,
  send: "/v1/push/send"
});

/** Clamp text to a contract limit, ending with an ellipsis when cut. */
export function clampPushText(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}
