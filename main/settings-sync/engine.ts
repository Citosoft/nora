import { decodeEntries, encodeSetting, mergeEntries, newer, settingKeys } from "@shared/settings-sync/entries";
import { trackChanges } from "./journal";
import type { SyncEngineDeps } from "@main/types/settings-sync/service.types";
import type { SyncEntries } from "@shared/types/settings-sync/sync.types";

/** Merge independently versioned settings, retaining edits made during reads, writes and retries. */
export async function syncSettings(deps: SyncEngineDeps): Promise<void> {
  const { journal, signal, session, client } = deps;
  const track = (): void => trackChanges(journal, deps.readLocal(), deps.deviceId, deps.now());
  track(); await deps.persist();
  const remote = await client.read(session, signal);
  signal.throwIfAborted();
  const entries = remote?.entries ?? {};
  journal.clock = Math.max(journal.clock, ...Object.values(entries).map((entry) => entry.updatedAt));
  track();
  if (!journal.initialized && journal.seedLocal) {
    for (const key of settingKeys) {
      if (!entries[key] && !journal.pending[key]) {
        const value = encodeSetting(journal.baseline, key);
        if (value !== undefined) journal.pending[key] = { value, updatedAt: Math.max(deps.now(), journal.clock + 1), deviceId: deps.deviceId };
      }
    }
  }
  const patch: SyncEntries = {};
  for (const key of settingKeys) { const entry = journal.pending[key]; if (entry && newer(entry, entries[key])) patch[key] = entry; }
  await deps.persist();
  const acknowledged = Object.keys(patch).length ? await client.write(session, patch, signal) : { version: 1 as const, entries };
  signal.throwIfAborted();
  journal.clock = Math.max(journal.clock, ...Object.values(acknowledged.entries).map((entry) => entry.updatedAt));
  track();
  const merged = mergeEntries(acknowledged.entries, journal.pending);
  const expected = deps.readLocal();
  const applied = await deps.apply(decodeEntries(merged), expected);
  signal.throwIfAborted();
  // A setting changed during the upload remains pending for the next pass.
  for (const key of settingKeys) {
    const local = journal.pending[key]; const saved = acknowledged.entries[key];
    if (local && saved && (!newer(local, saved) || local.value === saved.value)) delete journal.pending[key];
  }
  journal.baseline = applied; track();
  journal.initialized = true; journal.seedLocal = false; journal.lastSyncedAt = deps.now();
  await deps.persist();
}
