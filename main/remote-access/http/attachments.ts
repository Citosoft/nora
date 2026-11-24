import { COMPOSER_ATTACHMENT_MAX_BYTES } from "@shared/composerAttachments";
import { remoteAttachmentRequestSchema, remoteAttachmentResponseSchema } from "@shared/remote-access/attachments";
import type { RuntimeApiOptions } from "@main/types/remote-access/http/runtime.types";
import { RuntimeFailure } from "./failure";

export async function uploadRemoteAttachment(options: RuntimeApiOptions, body: unknown): Promise<Response> {
  if (!options.attachments) throw new RuntimeFailure("unavailable", "Uploading files is not available on this runtime.");
  const input = remoteAttachmentRequestSchema.parse(body);
  const data = Buffer.from(input.data, "base64");
  if (data.byteLength > COMPOSER_ATTACHMENT_MAX_BYTES) throw new RuntimeFailure("too-large", "Files must be 20 MB or smaller.");
  const attachment = await options.attachments.save({ name: input.name, mimeType: input.mimeType, data });
  return Response.json(remoteAttachmentResponseSchema.parse({ attachment }));
}
