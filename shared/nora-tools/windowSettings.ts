import { z } from "zod";
import { appearanceSchema } from "@shared/settings-sync/contracts";

export const localSettingsSchema = z.object({
  defaultIdeId: z.string().nullable(), forceMacTitleBarPreview: z.boolean(),
  githubToken: z.string(), gitlabToken: z.string(), gitlabHost: z.string(), vercelToken: z.string(),
  githubAccountLabel: z.string().nullable(), gitlabAccountLabel: z.string().nullable(), vercelAccountLabel: z.string().nullable(),
  vercelWorkspaceLinks: z.record(z.string(), z.object({ vercelProjectId: z.string(), teamId: z.string().nullable() }).strict())
}).strict();
export const windowSettingsSchema = z.object({ appearance: appearanceSchema, local: localSettingsSchema }).strict();
export const windowSettingsPatchSchema = z.object({ appearance: appearanceSchema.partial().optional(), local: localSettingsSchema.partial().optional() }).strict();
export const windowSettingsRequestSchema = z.object({ id: z.string(), patch: windowSettingsPatchSchema }).strict();
export const windowSettingsReplySchema = z.discriminatedUnion("status", [
  z.object({ id: z.string(), status: z.literal("success"), settings: windowSettingsSchema }).strict(),
  z.object({ id: z.string(), status: z.literal("error"), message: z.string() }).strict()
]);
export const WINDOW_SETTINGS_CHANNELS = { request: "app:window-settings-request", reply: "app:window-settings-reply" } as const;
