import { z } from "zod";
import { providerKindSchema } from "@shared/providers/providerKinds";

export const externalSessionOriginSchema = z.enum(["cli", "desktop"]);

export const externalSessionSchema = z.object({
  origin: externalSessionOriginSchema,
  id: z.string().min(1).max(512), title: z.string().min(1),
  providerKind: providerKindSchema, instanceId: z.string().min(1),
  cwd: z.string().min(1), createdAt: z.string().datetime(), updatedAt: z.string().datetime()
}).strict();
export const externalSessionsResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("available"), sessions: z.array(externalSessionSchema) }).strict(),
  z.object({ status: z.literal("unavailable"), message: z.string().min(1) }).strict()
]);
