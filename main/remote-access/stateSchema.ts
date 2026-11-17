import { z } from "zod";
import { installationIdSchema, runtimeDirectoryEntrySchema, runtimeNameSchema, runtimePortSchema } from "@shared/remote-access/directory";

export const remoteStateSchema = z.object({
  version: z.literal(1), installationId: installationIdSchema, name: runtimeNameSchema,
  enabled: z.boolean(), ownerId: z.string().min(1).nullable(), port: runtimePortSchema.nullable(),
  runtime: runtimeDirectoryEntrySchema.nullable(), connectorSecret: z.string().max(16384).nullable(),
  cleanup: z.array(z.object({ ownerId: z.string().min(1), installationId: installationIdSchema }).strict()).max(32)
}).strict().superRefine((state, context) => {
  if (state.enabled && !state.ownerId) context.addIssue({ code: "custom", message: "Enabled remote access must have an owner." });
  if (state.runtime && state.runtime.installationId !== state.installationId) context.addIssue({ code: "custom", message: "Runtime installation does not match this device." });
});
