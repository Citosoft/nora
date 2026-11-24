import { z } from "zod";
import { botAvatarSchema, botDefinitionSchema, botIdSchema, botScopeSchema } from "@shared/bots/contracts";
import { threadPreferencesSchema } from "@shared/personalization/contracts";

/** Only these portable preferences are exposed remotely; credentials and machine paths stay on the host. */
export const remoteSettingsSchema = threadPreferencesSchema.pick({ automaticTitles: true, automaticMemory: true, followUp: true, toolOutputBudget: true });
export const remoteSettingsPatchSchema = remoteSettingsSchema.partial().refine((patch) => Object.keys(patch).length > 0, "Choose a setting to update.");
export const botSettingsResponseSchema = z.object({ bots: z.array(botDefinitionSchema) }).strict();
export const saveRemoteBotSchema = z.object({
  id: botIdSchema,
  scope: botScopeSchema,
  revision: z.number().int().positive().nullable(),
  ...botDefinitionSchema.pick({ name: true, role: true, instructions: true }).shape,
  avatar: botAvatarSchema
}).strict();
