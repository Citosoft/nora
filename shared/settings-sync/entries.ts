import { portableSettingsSchema, settingKeySchema } from "./contracts";
import type { PortableSettings, SettingKey, SyncEntries, SyncEntry } from "@shared/types/settings-sync/sync.types";

export const settingKeys = settingKeySchema.options;
export const encodeSetting = <K extends SettingKey>(settings: Partial<PortableSettings>, key: K): string | undefined => JSON.stringify(settings[key]);
export function newer(left: SyncEntry, right: SyncEntry | undefined): boolean {
  return !right || left.updatedAt > right.updatedAt || (left.updatedAt === right.updatedAt && left.deviceId > right.deviceId);
}
export function mergeEntries(remote: SyncEntries, local: SyncEntries): SyncEntries {
  const merged = { ...remote };
  for (const key of settingKeys) { const entry = local[key]; if (entry && newer(entry, remote[key])) merged[key] = entry; }
  return merged;
}
export function decodeEntries(entries: SyncEntries): Partial<PortableSettings> {
  const values: Partial<PortableSettings> = {};
  const set = <K extends SettingKey>(key: K, value: PortableSettings[K]): void => { values[key] = value; };
  for (const key of settingKeys) {
    const entry = entries[key];
    if (!entry) continue;
    const input: unknown = JSON.parse(entry.value);
    set(key, portableSettingsSchema.shape[key].parse(input));
  }
  return values;
}
/** Ignore unknown future settings, but reject invalid known values before applying any changes. */
export function validateEntries(entries: SyncEntries): SyncEntries { decodeEntries(entries); return entries; }
export function changedEntries(before: PortableSettings, next: PortableSettings, pending: SyncEntries, deviceId: string, now: number): SyncEntries {
  const result = { ...pending };
  for (const key of settingKeys) {
    const value = encodeSetting(next, key);
    if (value !== undefined && value !== encodeSetting(before, key)) result[key] = { value, updatedAt: Math.max(now, (pending[key]?.updatedAt ?? 0) + 1), deviceId };
  }
  return result;
}
/** A cloud result must not overwrite an edit made while its request was in flight. */
export function applicableSettings(current: PortableSettings, incoming: Partial<PortableSettings>, expected: PortableSettings): Partial<PortableSettings> {
  const result: Partial<PortableSettings> = {};
  const set = <K extends SettingKey>(key: K, value: PortableSettings[K]): void => { result[key] = value; };
  for (const key of settingKeys) {
    const value = incoming[key];
    if (value !== undefined && encodeSetting(current, key) === encodeSetting(expected, key)) set(key, value);
  }
  return result;
}
