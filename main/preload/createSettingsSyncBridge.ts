import { SYNC_CHANNELS, syncAppliedSchema, syncRequestSchema, syncStateSchema } from "@shared/settings-sync/contracts";
import type { SettingsSyncBridge } from "@shared/types/settings-sync/sync.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createSettingsSyncBridge(): SettingsSyncBridge {
  return {
    async request(input) { return syncStateSchema.parse(await invokeIpc(SYNC_CHANNELS.request, syncRequestSchema.parse(input))); },
    onChanged(listener) {
      return subscribeToIpcEvent<unknown>(SYNC_CHANNELS.changed, (input) => { const parsed = syncStateSchema.safeParse(input); if (parsed.success) listener(parsed.data); });
    },
    onApplied(listener) {
      return subscribeToIpcEvent<unknown>(SYNC_CHANNELS.applied, (input) => { const parsed = syncAppliedSchema.safeParse(input); if (parsed.success) listener(parsed.data); });
    }
  };
}
