import { z } from "zod";
import { providerKindSchema } from "@shared/providers/providerKinds";
import { botSettingsSchema } from "@shared/bots/contracts";

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
/** Provider and model new threads start with; absent means the first available provider and its first model. */
export const threadModelDefaultSchema = z.object({
  kind: providerKindSchema,
  instanceId: z.string().min(1).max(512),
  model: z.string().min(1).max(512)
}).strict();
export const idleCompactionModeSchema = z.enum(["suggest", "before-expiry", "off"]);
export const threadPreferencesSchema = z.object({
  toolOutputBudget: z.enum(["compact", "provider-default"]),
  subagentModel: threadModelDefaultSchema.nullable(),
  followUp: z.enum(["queue", "steer"]),
  automaticTitles: z.boolean(),
  /** Review finished threads in the background and keep what is worth remembering as Nora's or the bot's notes. */
  automaticMemory: z.boolean(),
  settleAfterDays: z.number().int().min(1).max(365).nullable(),
  claudeAutoCompactTokens: z.number().int().min(100_000).max(1_000_000).nullable()
}).strict();
export const threadPreferencesPatchSchema = threadPreferencesSchema.partial();
export const personalizationSchema = z.object({
  defaultRole: roleSelectionSchema.nullable(),
  workspaceRoles: z.record(z.string().min(1).max(512), roleSelectionSchema),
  threadModel: threadModelDefaultSchema.optional(),
  idleCompaction: idleCompactionModeSchema.optional(),
  threads: threadPreferencesPatchSchema.optional(),
  /** Global and private workspace bots; shared workspace bots are read from each workspace. */
  bots: botSettingsSchema.optional()
}).strict();
