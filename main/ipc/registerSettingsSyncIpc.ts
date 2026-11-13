import { SYNC_CHANNELS, syncRequestSchema } from "@shared/settings-sync/contracts";
import type { SyncIpcDeps } from "@main/types/settings-sync/ipc.types";

export function registerSettingsSyncIpc({ ipc, service, isAllowedSender }: SyncIpcDeps): () => void {
  ipc.handle(SYNC_CHANNELS.request, (event, input: unknown) => {
    if (!isAllowedSender(event)) throw new Error("This window cannot access settings sync.");
    return service.request(syncRequestSchema.parse(input));
  });
  return () => ipc.removeHandler(SYNC_CHANNELS.request);
}
