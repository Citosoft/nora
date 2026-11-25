import { expoPushTokenSchema, pushDeviceEntrySchema } from "@shared/remote-access/push";
import type { ClerkPrivateMetadataApi } from "../types/directoryStore.types";
import type { PushDeviceSnapshot, PushDeviceStore, StoredPushDevice } from "../types/push.types";
import { parseKeyedMetadata } from "./keyedMetadata";

/** Private metadata key holding `{ [deviceId]: StoredPushDevice }`, next to the runtime directory. */
export const PUSH_DEVICES_METADATA_KEY = "noraPushDevices";

const storedPushDeviceSchema = pushDeviceEntrySchema.extend({ token: expoPushTokenSchema });

export function parsePushDevices(privateMetadata: unknown): PushDeviceSnapshot {
  return parseKeyedMetadata(privateMetadata, PUSH_DEVICES_METADATA_KEY, storedPushDeviceSchema, (device) => device.deviceId);
}

/** Same merge-patch semantics as the runtime directory store: `null` deletes a device, other keys are untouched. */
export function createPushDeviceStore(api: ClerkPrivateMetadataApi): PushDeviceStore {
  return {
    async read(userId) {
      return parsePushDevices(await api.readPrivateMetadata(userId));
    },
    async put(userId, device: StoredPushDevice, removeDeviceIds = []) {
      const removals = Object.fromEntries(removeDeviceIds.filter((id) => id !== device.deviceId).map((id) => [id, null]));
      await api.mergePrivateMetadata(userId, { [PUSH_DEVICES_METADATA_KEY]: { ...removals, [device.deviceId]: device } });
    },
    async remove(userId, deviceIds) {
      if (deviceIds.length === 0) return;
      await api.mergePrivateMetadata(userId, { [PUSH_DEVICES_METADATA_KEY]: Object.fromEntries(deviceIds.map((id) => [id, null])) });
    }
  };
}
