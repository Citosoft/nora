import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";

/** Budget for the serialized `noraRuntimes` value, leaving headroom under Clerk's 8 KB metadata limit. */
export const MAX_DIRECTORY_BYTES = 6 * 1024;

/**
 * Deterministic ordering for quota decisions: oldest registration wins, installation ID breaks ties. When two new
 * installations race past the pre-check, both re-read the same set and agree on which one rolls back.
 */
export function compareByRegistration(a: RuntimeDirectoryEntry, b: RuntimeDirectoryEntry): number {
  if (a.registeredAt !== b.registeredAt) return a.registeredAt < b.registeredAt ? -1 : 1;
  return a.installationId < b.installationId ? -1 : a.installationId > b.installationId ? 1 : 0;
}

/** True when `installationId` falls outside the first `max` entries of the stable ordering. */
export function exceedsQuota(entries: readonly RuntimeDirectoryEntry[], installationId: string, max: number): boolean {
  const index = [...entries].sort(compareByRegistration).findIndex((entry) => entry.installationId === installationId);
  return index >= max;
}

export function directorySizeBytes(entries: readonly RuntimeDirectoryEntry[]): number {
  const record = Object.fromEntries(entries.map((entry) => [entry.installationId, entry]));
  return new TextEncoder().encode(JSON.stringify(record)).byteLength;
}
