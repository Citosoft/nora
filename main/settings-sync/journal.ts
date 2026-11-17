import { z } from "zod";
import { portableSettingsSchema, settingKeySchema, syncEntriesSchema, syncEntrySchema } from "@shared/settings-sync/contracts";
import { changedEntries } from "@shared/settings-sync/entries";
import type { PortableSettings } from "@shared/types/settings-sync/sync.types";
import type { StoredSyncJournal, SyncJournal } from "@main/types/settings-sync/service.types";

/**
 * Saved journals must survive the synced-setting allowlist changing between versions. Baselines are read as partial
 * snapshots without settings that no longer exist, and pending entries for removed settings are dropped, so adding or
 * removing a setting never makes the whole sync state unreadable.
 */
const storedPendingSchema = z.record(z.string(), syncEntrySchema).transform((entries) =>
  Object.fromEntries(Object.entries(entries).filter(([key]) => settingKeySchema.safeParse(key).success))).pipe(syncEntriesSchema);
export const storedJournalSchema = z.object({ enabled: z.boolean(), initialized: z.boolean(), seedLocal: z.boolean(),
  clock: z.number().int().nonnegative(), baseline: portableSettingsSchema.partial().strip(), pending: storedPendingSchema,
  lastSyncedAt: z.number().nullable() }).strict();
export const syncStoreSchema = z.object({ version: z.literal(1), deviceId: z.string().min(1).max(64), lastUserId: z.string().nullable(),
  accounts: z.record(z.string(), storedJournalSchema) }).strict();

/**
 * Settings missing from a saved baseline were never synced from this device, so their current local values are the
 * unchanged baseline: they are neither pushed as edits nor overwritten until another device actually changes them.
 */
export function completeJournal(stored: StoredSyncJournal, local: PortableSettings): SyncJournal {
  return { ...stored, baseline: { ...local, ...stored.baseline } };
}

export function isCompleteJournal(journal: StoredSyncJournal): journal is SyncJournal {
  return settingKeySchema.options.every((key) => Object.hasOwn(journal.baseline, key));
}

export function trackChanges(journal: SyncJournal, current: PortableSettings, deviceId: string, now: number): void {
  journal.pending = changedEntries(journal.baseline, current, journal.pending, deviceId, Math.max(now, journal.clock + 1));
  journal.clock = Math.max(journal.clock, ...Object.values(journal.pending).map((entry) => entry.updatedAt));
  journal.baseline = structuredClone(current);
}
