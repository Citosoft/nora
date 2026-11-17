import type { StorageMigration } from "@main/types/account/storage.types";

export const STORAGE_MIGRATION_MARKER = "nora:renderer-storage-migrated";

/** Move file-origin preferences once; never overwrite preferences already saved at the new origin. */
export async function migrateStorage(storage: StorageMigration): Promise<void> {
  const current = new Map(await storage.readCurrent());
  if (current.has(STORAGE_MIGRATION_MARKER)) return;
  const entries = new Map(await storage.readLegacy());
  for (const [key, value] of current) entries.set(key, value);
  entries.delete(STORAGE_MIGRATION_MARKER);
  // Write the completion marker last so failed or interrupted migrations can be retried.
  await storage.writeCurrent([...entries, [STORAGE_MIGRATION_MARKER, "1"]]);
}
