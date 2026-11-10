import { z } from "zod";

export const presetRoleSchema = z.enum(["developer", "designer", "product", "writing", "research", "operations", "general"]);
export const roleSelectionSchema = z.discriminatedUnion("id", [
  z.object({ id: presetRoleSchema }).strict(),
  z.object({ id: z.literal("custom"), description: z.string().trim().min(1).max(500) }).strict()
]);
export const roleSnapshotSchema = z.object({
  selection: roleSelectionSchema,
  revision: z.number().int().positive(),
  guidance: z.string().min(1).max(8000)
}).strict();
export const personalizationSchema = z.object({
  defaultRole: roleSelectionSchema.nullable(),
  workspaceRoles: z.record(z.string().min(1).max(512), roleSelectionSchema)
}).strict();
