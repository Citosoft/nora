import type { z } from "zod";
import type { remoteSettingsSchema, remoteSettingsPatchSchema, saveRemoteBotSchema } from "@shared/remote-access/management";

export type RemoteSettings = z.infer<typeof remoteSettingsSchema>;
export type RemoteSettingsPatch = z.infer<typeof remoteSettingsPatchSchema>;
export type SaveRemoteBot = z.infer<typeof saveRemoteBotSchema>;
