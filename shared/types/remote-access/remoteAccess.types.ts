import type { z } from "zod";
import type { remoteAccessReplySchema, remoteAccessRequestSchema, remoteAccessStatusSchema, remoteAccessViewSchema, remoteAuditEntrySchema } from "@shared/remote-access/gateway";

export type RemoteAccessStatus = z.infer<typeof remoteAccessStatusSchema>;
export type RemoteAccessView = z.infer<typeof remoteAccessViewSchema>;
export type RemoteAuditEntry = z.infer<typeof remoteAuditEntrySchema>;
export type RemoteAccessRequest = z.infer<typeof remoteAccessRequestSchema>;
export type RemoteAccessReply = z.infer<typeof remoteAccessReplySchema>;
