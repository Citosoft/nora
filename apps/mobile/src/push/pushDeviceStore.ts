import { z } from "zod";
import { expoPushTokenSchema, pushDeviceIdSchema } from "@shared/remote-access/push";
import type { PushDeviceRecord, PushDeviceStore, PushDeviceStoreDeps } from "@/types/pushNotifications.types";

/** Kept apart from preferences so the device ID survives sign-out and "forget device data". */
const STORAGE_KEY = "nora.pushDevice.v1";

const recordSchema = z.object({
  deviceId: pushDeviceIdSchema,
  registered: z.object({ userId: z.string().min(1), token: expoPushTokenSchema }).nullable()
});

/** A stable, random device ID created on first use, so re-registering replaces this phone's entry instead of adding one. */
export function createPushDeviceStore(deps: PushDeviceStoreDeps): PushDeviceStore {
  return {
    async load() {
      const raw = await deps.storage.getItem(STORAGE_KEY).catch(() => null);
      const parsed = raw === null ? null : recordSchema.safeParse(safeJson(raw));
      if (parsed?.success) return parsed.data;
      const fresh: PushDeviceRecord = { deviceId: deps.createId(), registered: null };
      await deps.storage.setItem(STORAGE_KEY, JSON.stringify(fresh)).catch(() => undefined);
      return fresh;
    },
    async save(record) {
      await deps.storage.setItem(STORAGE_KEY, JSON.stringify(recordSchema.parse(record)));
    }
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
