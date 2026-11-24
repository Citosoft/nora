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
/** Upper bound on favourite models, so a runaway client can't grow settings without limit. */
export const FAVORITE_MODELS_MAX = 100;
/** Which saved model default a settings request changes. */
export const threadModelTargetSchema = z.enum(["thread", "nora-chat"]);
export const idleCompactionModeSchema = z.enum(["suggest", "before-expiry", "off"]);
export const threadPreferencesSchema = z.object({
  toolOutputBudget: z.enum(["compact", "provider-default"]),
  subagentModel: threadModelDefaultSchema.nullable(),
  followUp: z.enum(["queue", "steer"]),
  automaticTitles: z.boolean(),
  /** Review finished threads in the background and keep what is worth remembering as Nora's or the bot's notes. */
  automaticMemory: z.boolean(),
  /**
   * Predict the user's next message after each turn of their own threads, where the runtime supports it. Each prediction is one
   * more request over the thread's whole context, so bot threads and chats never make it.
   */
  promptSuggestions: z.boolean(),
  settleAfterDays: z.number().int().min(1).max(365).nullable(),
  claudeAutoCompactTokens: z.number().int().min(100_000).max(1_000_000).nullable()
}).strict();
export const threadPreferencesPatchSchema = threadPreferencesSchema.partial();
export const personalizationSchema = z.object({
  defaultRole: roleSelectionSchema.nullable(),
  workspaceRoles: z.record(z.string().min(1).max(512), roleSelectionSchema),
  threadModel: threadModelDefaultSchema.optional(),
  /** Provider and model the work threads of Nora's direct chat run on; absent means the new-thread default. */
  noraChatModel: threadModelDefaultSchema.optional(),
  /** Models pinned to the model picker's Favourites, in the order they were added; absent when there are none. */
  favoriteModels: z.array(threadModelDefaultSchema).max(FAVORITE_MODELS_MAX).optional(),
  idleCompaction: idleCompactionModeSchema.optional(),
  threads: threadPreferencesPatchSchema.optional(),
  /** Global and private workspace bots; shared workspace bots are read from each workspace. */
  bots: botSettingsSchema.optional()
}).strict();
