import { z } from "zod";
import { portableSettingsSchema, appearanceSchema } from "@shared/settings-sync/contracts";
import { idleCompactionModeSchema, threadModelDefaultSchema, threadPreferencesSchema, personalizationSchema } from "@shared/personalization/contracts";

import { localSettingsSchema } from "./windowSettings";

const providerStrings = z.object({ openai: z.string(), google: z.string(), anthropic: z.string() }).strict();
const aiSettingsSchema = z.object({
  preferredProvider: z.enum(["openai", "google", "anthropic"]), apiKeys: providerStrings, modelByProvider: providerStrings,
  simpleTaskProvider: z.enum(["cloud", "local", "codex", "claude"]),
  localLlmModelId: z.enum(["qwen2.5-0.5b-instruct", "smollm2-360m-instruct"])
}).strict();
const voiceSettingsSchema = z.object({ dictationProvider: z.enum(["openai", "localWhisper"]), localWhisperModelId: z.enum(["tiny.en", "base.en"]) }).strict();
const quickLaunchSchema = z.object({ name: z.string(), target: z.enum(["session-default", "root"]) }).strict();

export const generalSettingsSchema = portableSettingsSchema.pick({
  defaultSplitViewGridColumns: true, defaultSplitViewGridRows: true, rememberLastSplitViewPerWorkspace: true,
  confirmSplitViewDelete: true, showWorkspaceSessionTabs: true, agentCompletionNotificationsEnabled: true,
  openInternalBrowserOnNewPortDetection: true, fileEditorThemeId: true
}).extend({
  hardwareAccelerationEnabled: z.boolean().describe("Requires an app restart to take effect."),
  workspaceStateStorageMode: z.enum(["home", "repo"]),
  defaultAgentLaunchTarget: z.enum(["current-branch", "new", "existing", "branch-existing", "branch-new"]),
  preferredAgentToolId: z.string().trim().min(1).max(512).nullable(),
  analyticsConsentStatus: z.enum(["unknown", "granted", "declined"]),
  browserDataImportPromptSeen: z.boolean(), linuxAptSetupPromptDismissed: z.boolean(),
  terminalQuickLaunchDefaults: quickLaunchSchema,
  terminalPresets: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), shellId: z.string().nullable().optional(), workingDirectory: z.string(), commands: z.array(z.string()) }).strict()),
  ai: aiSettingsSchema, voice: voiceSettingsSchema
}).strict();

export const agentSettingsSchema = z.object({
  general: generalSettingsSchema,
  appearance: appearanceSchema, local: localSettingsSchema, syncEnabled: z.boolean(),
  personalization: personalizationSchema.omit({ threads: true, idleCompaction: true, threadModel: true }),
  threads: threadPreferencesSchema.extend({ idleCompaction: idleCompactionModeSchema, threadModel: threadModelDefaultSchema.nullable() })
}).strict();
export const agentSettingsPatchSchema = z.object({
  general: generalSettingsSchema.partial().extend({
    ai: aiSettingsSchema.partial().extend({ apiKeys: providerStrings.partial().optional(), modelByProvider: providerStrings.partial().optional() }).optional(),
    voice: voiceSettingsSchema.partial().optional(), terminalQuickLaunchDefaults: quickLaunchSchema.partial().optional()
  }).optional(),
  appearance: appearanceSchema.partial().optional(), local: localSettingsSchema.partial().optional(), syncEnabled: z.boolean().optional(),
  personalization: agentSettingsSchema.shape.personalization.partial().optional(),
  threads: agentSettingsSchema.shape.threads.partial().optional()
}).strict().refine((patch) => patch.syncEnabled !== undefined || [patch.general, patch.threads, patch.appearance, patch.local, patch.personalization].some((group) => group && Object.keys(group).length > 0),
  "Pass at least one setting to change.");
