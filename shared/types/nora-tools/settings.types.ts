import type { z } from "zod";
import type { windowSettingsSchema, windowSettingsPatchSchema, windowSettingsRequestSchema, windowSettingsReplySchema } from "@shared/nora-tools/windowSettings";
import type { agentSettingsSchema, agentSettingsPatchSchema } from "@shared/nora-tools/settings";

export type AgentSettings = z.infer<typeof agentSettingsSchema>;
export type AgentSettingsPatch = z.infer<typeof agentSettingsPatchSchema>;

export type WindowSettings = z.infer<typeof windowSettingsSchema>;
export type WindowSettingsPatch = z.infer<typeof windowSettingsPatchSchema>;
export type WindowSettingsRequest = z.infer<typeof windowSettingsRequestSchema>;
export type WindowSettingsReply = z.infer<typeof windowSettingsReplySchema>;
export interface WindowSettingsPort {
  request(patch: WindowSettingsPatch): Promise<WindowSettings>;
}
