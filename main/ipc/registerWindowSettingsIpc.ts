import { WINDOW_SETTINGS_CHANNELS, windowSettingsReplySchema } from "@shared/nora-tools/windowSettings";
import type { WindowSettingsIpcDeps } from "@main/types/nora-tools/windowSettings.types";

export function registerWindowSettingsIpc({ ipc, port, isAllowedSender }: WindowSettingsIpcDeps): void {
  ipc.handle(WINDOW_SETTINGS_CHANNELS.reply, (event, input: unknown) => {
    if (!isAllowedSender(event)) throw new Error("This window cannot change app settings.");
    port.receive(windowSettingsReplySchema.parse(input));
  });
}
