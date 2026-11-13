import { z } from "zod";
import { portableSettingsSchema, syncEntriesSchema } from "@shared/settings-sync/contracts";
import { changedEntries } from "@shared/settings-sync/entries";
import type { PortableSettings } from "@shared/types/settings-sync/sync.types";
import type { SyncJournal } from "@main/types/settings-sync/service.types";

export const journalSchema = z.object({ enabled: z.boolean(), initialized: z.boolean(), seedLocal: z.boolean(), clock: z.number().int().nonnegative(), baseline: portableSettingsSchema,
  pending: syncEntriesSchema, lastSyncedAt: z.number().nullable() }).strict();
export const syncStoreSchema = z.object({ version: z.literal(1), deviceId: z.string().min(1).max(64), lastUserId: z.string().nullable(), accounts: z.record(z.string(), journalSchema) }).strict();
export function trackChanges(journal: SyncJournal, current: PortableSettings, deviceId: string, now: number): void {
  journal.pending = changedEntries(journal.baseline, current, journal.pending, deviceId, Math.max(now, journal.clock + 1));
  journal.clock = Math.max(journal.clock, ...Object.values(journal.pending).map((entry) => entry.updatedAt));
  journal.baseline = structuredClone(current);
}
