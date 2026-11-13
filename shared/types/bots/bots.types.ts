import type { RoleId } from "@shared/types/personalization/roles.types";
import type { z } from "zod";
import type { BOT_AVATAR_EYES, BOT_AVATAR_PALETTES, BOT_AVATAR_SHAPES, botAvatarSchema, botBindingSchema, botDefinitionSchema,
  botFileProblemSchema, botScopeSchema, botAuthorSchema, groupMemberSchema, groupSchema, groupRequestSchema, botMemoryEntrySchema, botSettingsSchema, botSnapshotSchema, sharedBotSetSchema, workspaceBotSettingsSchema } from "@shared/bots/contracts";

export type BotAvatarShape = (typeof BOT_AVATAR_SHAPES)[number];
export type BotAvatarPalette = (typeof BOT_AVATAR_PALETTES)[number];
export type BotAvatarEyes = (typeof BOT_AVATAR_EYES)[number];
export type BotAvatar = z.infer<typeof botAvatarSchema>;
export type BotBinding = z.infer<typeof botBindingSchema>;
export type BotScope = z.infer<typeof botScopeSchema>;
export type BotDefinition = z.infer<typeof botDefinitionSchema>;
export type WorkspaceBotSettings = z.infer<typeof workspaceBotSettingsSchema>;
export type BotSettings = z.infer<typeof botSettingsSchema>;
export type BotFileProblem = z.infer<typeof botFileProblemSchema>;
export type SharedBotSet = z.infer<typeof sharedBotSetSchema>;
export type BotSnapshot = z.infer<typeof botSnapshotSchema>;
/** Avatar with every optional part resolved from its seed. */
export interface ResolvedBotAvatar {
  shape: BotAvatarShape;
  palette: BotAvatarPalette;
  eyes: BotAvatarEyes;
  seed: number;
}
/** Where a bot in the effective catalog came from, for settings and override explanations. */
export type BotOrigin = "global" | "shared" | "private";
export interface EffectiveBot {
  bot: BotDefinition;
  origin: BotOrigin;
  /** Lower layers this definition overrides for the workspace. */
  overrides: readonly BotOrigin[];
}
export type BotAuthor = z.infer<typeof botAuthorSchema>;
export type GroupMember = z.infer<typeof groupMemberSchema>;
export type GroupDescriptor = z.infer<typeof groupSchema>;
export type GroupRequest = z.infer<typeof groupRequestSchema>;
export type BotMemoryEntry = z.infer<typeof botMemoryEntrySchema>;
/** A starting point for a new bot; avatar parts are pinned so each template keeps a recognisable face. */
export interface BotTemplate {
  id: string;
  /** Roles this template suits; it is suggested first to users with one of them. */
  roles: readonly Exclude<RoleId, "custom">[];
  name: string;
  role: string;
  summary: string;
  instructions: string;
  avatar: { shape: BotAvatarShape; palette: BotAvatarPalette; eyes: BotAvatarEyes };
}
export interface BotTemplateSuggestions { suggested: readonly BotTemplate[]; more: readonly BotTemplate[]; }
