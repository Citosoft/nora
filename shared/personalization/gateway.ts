import { pausedRoutineInputSchema, ROUTINES_PER_BOT_MAX } from "@shared/bots/routines/contracts";
import { z } from "zod";
import { providerKindSchema } from "@shared/providers/providerKinds";
import { idleCompactionModeSchema, personalizationSchema, roleSelectionSchema, threadModelDefaultSchema, threadModelTargetSchema, threadPreferencesPatchSchema } from "./contracts";
import { nativeWorkspaceSchema } from "./workspaces";
import { noraToolsStatusSchema } from "@shared/nora-tools/catalog";
import { botDefinitionSchema, botIdSchema, botScopeSchema, sharedBotSetSchema } from "@shared/bots/contracts";

export const nativeProviderSchema = z.object({ kind: providerKindSchema, instanceId: z.string().min(1), label: z.string().min(1),
  /** Whether the runtime reports its configured MCP servers; runtimes that do not are left out of MCP discovery. */
  reportsMcp: z.boolean() }).strict();
export const personalizationRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("boot") }).strict(),
  /** Re-detects installed runtimes so agents installed while Nora runs become usable without a restart. */
  z.object({ kind: z.literal("refresh-providers") }).strict(),
  z.object({ kind: z.literal("onboard"), role: roleSelectionSchema }).strict(),
  z.object({ kind: z.literal("set-role"), workspaceId: z.string().min(1).nullable(), role: roleSelectionSchema.nullable() }).strict(),
  /**
   * Null clears the default: new threads fall back to the first available provider, and Nora's chat to the new-thread default.
   * An absent target is the new-thread default.
   */
  z.object({ kind: z.literal("set-thread-model"), model: threadModelDefaultSchema.nullable(), target: threadModelTargetSchema.optional() }).strict(),
  /** Adds a model to, or removes it from, the model picker's Favourites. */
  z.object({ kind: z.literal("set-favorite-model"), model: threadModelDefaultSchema, favorite: z.boolean() }).strict(),
  z.object({ kind: z.literal("set-idle-compaction"), mode: idleCompactionModeSchema }).strict(),
  z.object({ kind: z.literal("set-thread-preferences"), patch: threadPreferencesPatchSchema }).strict(),
  z.object({ kind: z.literal("add-workspace") }).strict(),
  z.object({ kind: z.literal("register-workspace"), projectId: z.string().min(1) }).strict(),
  /** Re-reads a project's ready worktrees into its workspace's checkouts, e.g. right after creating one for a thread. */
  z.object({ kind: z.literal("sync-checkouts"), projectId: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("open-workspace-folder"), workspaceId: z.string().min(1) }).strict(),
  /** Creates (no previous scope) or updates a bot where its scope says; moving between scopes keeps its id and bumps its revision. */
  z.object({ kind: z.literal("save-bot"), bot: botDefinitionSchema, previousScope: botScopeSchema.nullable(),
    expectedRevision: z.number().int().positive().optional(),
    initialRoutines: z.array(pausedRoutineInputSchema).max(ROUTINES_PER_BOT_MAX).optional() }).strict(),
  z.object({ kind: z.literal("delete-bot"), botId: botIdSchema, scope: botScopeSchema }).strict(),
  z.object({ kind: z.literal("set-bot-hidden"), workspaceId: z.string().min(1), botId: botIdSchema, hidden: z.boolean() }).strict(),
  /** Re-reads shared bot files after they change outside Nora. */
  z.object({ kind: z.literal("refresh-bots") }).strict()
]);
export const nativeBootSchema = z.object({ environmentId: z.string().min(1), cursor: z.number().int().nonnegative(), personalization: personalizationSchema,
  workspaces: z.array(nativeWorkspaceSchema), providers: z.array(nativeProviderSchema), sharedBots: z.array(sharedBotSetSchema),
  noraTools: noraToolsStatusSchema }).strict();
export const personalizationReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), state: nativeBootSchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
export const personalizationChannel = "personalization:request";
/** Main → window: personalization changed outside a window request, e.g. a bot created by a thread's tools. */
export const personalizationChangedChannel = "personalization:changed";
