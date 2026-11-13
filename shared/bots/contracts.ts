import { z } from "zod";
import { providerKindSchema } from "@shared/providers/providerKinds";

export const BOT_AVATAR_SHAPES = ["circle", "squircle", "pill", "pebble", "egg", "drop", "cloud", "flower", "clover", "sparkle",
  "star", "heart", "ghost", "shield", "leaf", "triangle", "pentagon", "hexagon"] as const;
export const BOT_AVATAR_PALETTES = ["violet", "teal", "coral", "pink", "blue", "green", "amber", "lilac", "mint", "peach"] as const;
export const BOT_AVATAR_EYES = ["dot", "oval", "pupil"] as const;
export const BOT_NAME_MAX = 40;
export const BOT_ROLE_MAX = 80;
export const BOT_INSTRUCTIONS_MAX = 8000;

const id = z.string().min(1).max(512);
/** Bot ids double as shared file stems, so they stay lowercase slugs. */
export const botIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Bot ids are lowercase words joined by hyphens").max(64);
export const botAvatarSchema = z.object({
  seed: z.number().int().nonnegative().max(2_147_483_646),
  shape: z.enum(BOT_AVATAR_SHAPES).optional(),
  palette: z.enum(BOT_AVATAR_PALETTES).optional(),
  eyes: z.enum(BOT_AVATAR_EYES).optional()
}).strict();
/** The provider and model every new thread with the bot starts on; a null policy uses the runtime's first policy. */
export const botBindingSchema = z.object({
  kind: providerKindSchema,
  instanceId: id,
  model: id,
  reasoning: z.string().min(1).max(64).nullable(),
  permissionPolicy: id.nullable()
}).strict();
export const botScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("global") }).strict(),
  z.object({ kind: z.literal("workspace"), workspaceId: id, storage: z.enum(["shared", "private"]) }).strict()
]);
export const botDefinitionSchema = z.object({
  id: botIdSchema,
  name: z.string().trim().min(1).max(BOT_NAME_MAX),
  role: z.string().trim().max(BOT_ROLE_MAX),
  instructions: z.string().trim().max(BOT_INSTRUCTIONS_MAX),
  binding: botBindingSchema,
  avatar: botAvatarSchema,
  scope: botScopeSchema,
  revision: z.number().int().positive()
}).strict();
/** Bot definitions kept in local settings; shared workspace bots live in the workspace instead. */
export const workspaceBotSettingsSchema = z.object({
  private: z.array(botDefinitionSchema).max(200),
  hidden: z.array(botIdSchema).max(500)
}).strict();
export const botSettingsSchema = z.object({
  global: z.array(botDefinitionSchema).max(200),
  workspaces: z.record(id, workspaceBotSettingsSchema)
}).strict();
export const botFileProblemSchema = z.object({ file: z.string().min(1), message: z.string().min(1) }).strict();
export const sharedBotSetSchema = z.object({
  workspaceId: id,
  bots: z.array(botDefinitionSchema),
  problems: z.array(botFileProblemSchema)
}).strict();
/** Frozen on a conversation at creation; later bot edits only affect new threads. */
export const botSnapshotSchema = z.object({
  botId: botIdSchema,
  revision: z.number().int().positive(),
  name: z.string().min(1).max(BOT_NAME_MAX),
  role: z.string().max(BOT_ROLE_MAX),
  avatar: botAvatarSchema,
  binding: botBindingSchema,
  guidance: z.string().min(1).max(BOT_INSTRUCTIONS_MAX + 1000)
}).strict();

export const GROUP_MEMBERS_MIN = 2;
export const GROUP_MEMBERS_MAX = 6;
export const GROUP_HOP_LIMIT_DEFAULT = 4;
/** `@everyone` in a group message asks every member, in member order. */
export const GROUP_EVERYONE_MENTION = "everyone";
export const BOT_MEMORY_TEXT_MAX = 1000;
/** Who wrote a group-chat message; name and avatar are kept so history renders after the bot changes or is deleted. */
export const botAuthorSchema = z.object({ kind: z.literal("bot"), botId: botIdSchema, name: z.string().min(1).max(BOT_NAME_MAX), avatar: botAvatarSchema }).strict();
export const groupMemberSchema = z.object({ botId: botIdSchema, name: z.string().min(1).max(BOT_NAME_MAX), role: z.string().max(BOT_ROLE_MAX), avatar: botAvatarSchema }).strict();
/** A group chat's members, frozen at creation; each member answers in its own child thread. */
export const groupSchema = z.object({
  members: z.array(groupMemberSchema).min(GROUP_MEMBERS_MIN).max(GROUP_MEMBERS_MAX),
  /** The one member allowed to change files; everyone else reads. */
  writer: botIdSchema.nullable(),
  /** Answers messages nobody @mentioned and the router could not place; groups created before leads existed have none. */
  lead: botIdSchema.nullable().default(null),
  hopLimit: z.number().int().min(1).max(8)
}).strict();
export const groupRequestSchema = z.object({
  botIds: z.array(botIdSchema).min(GROUP_MEMBERS_MIN).max(GROUP_MEMBERS_MAX).refine((ids) => new Set(ids).size === ids.length, "Each bot can join a group once"),
  writer: botIdSchema.nullable(),
  lead: botIdSchema.nullable().default(null)
}).strict();
export const botMemoryEntrySchema = z.object({
  id,
  botId: botIdSchema,
  /** Null applies wherever the bot runs. */
  workspaceId: id.nullable(),
  text: z.string().trim().min(1).max(BOT_MEMORY_TEXT_MAX),
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("bot"), conversationId: id }).strict(),
    z.object({ kind: z.literal("user") }).strict()
  ]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).strict();
