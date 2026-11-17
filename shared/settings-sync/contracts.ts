import { z } from "zod";
import { idleCompactionModeSchema, roleSelectionSchema, threadPreferencesSchema } from "@shared/personalization/contracts";
import { providerKindSchema } from "@shared/providers/providerKinds";

const model = z.object({ kind: providerKindSchema, model: z.string().min(1).max(512) }).strict().nullable();
export const appearanceSchema = z.object({
  themeMode: z.enum(["system", "light", "dark"]), accentColor: z.enum(["silver", "green", "blue", "amber", "rose", "violet"]),
  uiFontId: z.enum(["system", "inter", "geist", "manrope", "dm-sans", "space-grotesk", "outfit", "plus-jakarta-sans"]),
  terminalThemeId: z.enum(["app", "vscode-dark", "dracula", "solarized-dark", "solarized-light"]),
  terminalFontId: z.enum(["ibm-plex-mono", "jetbrains-mono", "fira-code", "cascadia-mono", "source-code-pro", "space-mono"]),
  userDisplayName: z.string().trim().max(256)
}).strict();
/** An explicit allowlist: never serialize AppSettings or renderer storage wholesale. */
export const portableSettingsSchema = appearanceSchema.extend({
  defaultSplitViewGridColumns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  defaultSplitViewGridRows: z.union([z.literal(1), z.literal(2)]),
  rememberLastSplitViewPerWorkspace: z.boolean(), confirmSplitViewDelete: z.boolean(), showWorkspaceSessionTabs: z.boolean(),
  agentCompletionNotificationsEnabled: z.boolean(), openInternalBrowserOnNewPortDetection: z.boolean(),
  fileEditorThemeId: z.enum(["default", "high-contrast"]),
  defaultRole: roleSelectionSchema.nullable(), idleCompaction: idleCompactionModeSchema,
  threadModel: model, subagentModel: model,
  ...threadPreferencesSchema.omit({ subagentModel: true }).shape
}).strict();
export const settingKeySchema = portableSettingsSchema.keyof();
export const syncEntrySchema = z.object({ value: z.string().max(2048), updatedAt: z.number().int().nonnegative(), deviceId: z.string().min(1).max(64) }).strict();
export const syncEntriesSchema = z.partialRecord(settingKeySchema, syncEntrySchema);
export const syncDocumentSchema = z.object({ version: z.literal(1), entries: syncEntriesSchema }).strict();
export const syncStateSchema = z.object({
  enabled: z.boolean(), phase: z.enum(["signed-out", "off", "idle", "pending", "syncing", "error"]),
  lastSyncedAt: z.number().nullable(), message: z.string().nullable()
}).strict();
export const syncAppliedSchema = z.object({ values: portableSettingsSchema.partial(), expected: portableSettingsSchema }).strict();
export const syncRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("read") }).strict(),
  z.object({ kind: z.literal("set-enabled"), enabled: z.boolean() }).strict(),
  z.object({ kind: z.literal("sync") }).strict(),
  z.object({ kind: z.literal("appearance"), appearance: appearanceSchema }).strict()
]);
export const SYNC_CHANNELS = { request: "settings-sync:request", changed: "settings-sync:changed", applied: "settings-sync:applied" } as const;
