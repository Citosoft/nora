import type { z } from "zod";
import type { remoteAttachmentRequestSchema } from "@shared/remote-access/attachments";

export type RemoteAttachmentRequest = z.infer<typeof remoteAttachmentRequestSchema>;
