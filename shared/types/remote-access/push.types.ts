import type { z } from "zod";
import type { deletePushDeviceResponseSchema, pushDeviceEntrySchema, pushDeviceResponseSchema, pushNoticeKindSchema, pushNotificationSchema,
  pushPayloadDataSchema, pushPlatformSchema, pushTargetSchema, registerPushDeviceRequestSchema, sendPushRequestSchema,
  sendPushResponseSchema } from "@shared/remote-access/push";

export type PushPlatform = z.infer<typeof pushPlatformSchema>;
export type RegisterPushDeviceRequest = z.infer<typeof registerPushDeviceRequestSchema>;
export type PushDeviceEntry = z.infer<typeof pushDeviceEntrySchema>;
export type PushDeviceResponse = z.infer<typeof pushDeviceResponseSchema>;
export type DeletePushDeviceResponse = z.infer<typeof deletePushDeviceResponseSchema>;
export type PushNoticeKind = z.infer<typeof pushNoticeKindSchema>;
export type PushTarget = z.infer<typeof pushTargetSchema>;
export type PushNotification = z.infer<typeof pushNotificationSchema>;
export type SendPushRequest = z.infer<typeof sendPushRequestSchema>;
export type SendPushResponse = z.infer<typeof sendPushResponseSchema>;
export type PushPayloadData = z.infer<typeof pushPayloadDataSchema>;
