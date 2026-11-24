import { z } from "zod";
import { COMPOSER_ATTACHMENT_MAX_BYTES } from "@shared/composerAttachments";
import { REMOTE_LIMITS } from "./constants";

export const REMOTE_ATTACHMENT_ROUTE = "/v1/attachments";
const maxBase64Length = Math.ceil(COMPOSER_ATTACHMENT_MAX_BYTES / 3) * 4;
export const remoteAttachmentRequestSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().max(255),
  data: z.string().max(maxBase64Length).regex(/^[A-Za-z0-9+/]*={0,2}$/).refine((data) => data.length % 4 === 0)
}).strict();
export const remoteAttachmentResponseSchema = z.object({ attachment: z.object({
  id: z.string().min(1), name: z.string().min(1).max(255), path: z.string().min(1).max(32768),
  mimeType: z.string().min(1).max(255), size: z.number().int().min(0).max(COMPOSER_ATTACHMENT_MAX_BYTES)
}).strict() }).strict();

/** Only file uploads get the larger envelope; ordinary commands retain their existing bound. */
export function runtimeBodyLimit(method: string, pathname: string): number {
  return method === "POST" && pathname === REMOTE_ATTACHMENT_ROUTE ? maxBase64Length + 4096 : REMOTE_LIMITS.maxBodyBytes;
}
