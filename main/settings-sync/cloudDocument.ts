import { z } from "zod";
import { syncEntrySchema, settingKeySchema } from "@shared/settings-sync/contracts";
import { newer, settingKeys, validateEntries } from "@shared/settings-sync/entries";
import type { SyncEntries, SyncEntry } from "@shared/types/settings-sync/sync.types";
import type { ClerkMetadata, CloudPatch, CloudSnapshot } from "@main/types/settings-sync/client.types";

export const METADATA_KEY = "noraSettingsSync";
export const metadataSchema = z.record(z.string(), z.json());
const cloudFieldSchema = z.object({ value: z.string().optional(), updatedAt: z.number().optional(), deviceId: z.string().optional() }).catchall(syncEntrySchema);
const documentBoundary = z.object({ version: z.union([z.literal(1), z.literal(2)]), entries: z.record(z.string(), cloudFieldSchema) });
const revisionId = (entry: SyncEntry): string => `${entry.updatedAt.toString(36)}:${entry.deviceId}`;

export function readCloudDocument(metadata: ClerkMetadata): CloudSnapshot {
  const raw = metadata[METADATA_KEY];
  if (raw === undefined || raw === null) return { document: null, entries: {}, version: null, legacyFields: [] };
  const parsed = documentBoundary.safeParse(raw);
  if (!parsed.success) throw new Error("Cloud settings use an unsupported or invalid format. Update Nora before syncing.");
  const entries: SyncEntries = {};
  const cloud: CloudSnapshot["entries"] = {}; const legacyFields: string[] = [];
  for (const [key, field] of Object.entries(parsed.data.entries)) {
    const revisions: Record<string, SyncEntry> = {};
    if (field.value !== undefined || field.updatedAt !== undefined || field.deviceId !== undefined) {
      const legacy = syncEntrySchema.safeParse({ value: field.value, updatedAt: field.updatedAt, deviceId: field.deviceId });
      if (!legacy.success) throw new Error("Cloud settings contain an invalid legacy setting. No settings were changed.");
      revisions[revisionId(legacy.data)] = legacy.data; legacyFields.push(key);
    }
    for (const [id, value] of Object.entries(field)) {
      if (id === "value" || id === "updatedAt" || id === "deviceId") continue;
      const entry = syncEntrySchema.parse(value);
      if (id !== revisionId(entry)) throw new Error("Cloud settings contain an invalid revision. No settings were changed.");
      revisions[id] = entry;
    }
    cloud[key] = revisions;
    const known = settingKeySchema.safeParse(key);
    if (!known.success) continue;
    for (const entry of Object.values(revisions)) {
      if (newer(entry, entries[known.data])) entries[known.data] = entry;
    }
  }
  try { return { document: { version: 1, entries: validateEntries(entries) }, entries: cloud, version: parsed.data.version, legacyFields }; }
  catch { throw new Error("Cloud settings contain invalid values. No settings were changed."); }
}

/** Immutable revision keys let concurrent writes merge safely without provider-specific compare-and-swap. */
export function prepareCloudPatch(metadata: ClerkMetadata, local: SyncEntries): CloudPatch {
  const snapshot = readCloudDocument(metadata);
  const projected = { ...snapshot.entries };
  const patch: CloudPatch = {};
  for (const key of settingKeys) {
    const saved = snapshot.document?.entries[key]; const candidate = local[key];
    const winner = candidate && newer(candidate, saved) ? candidate : saved;
    if (!winner) continue;
    const keep = revisionId(winner); const revisions = snapshot.entries[key] ?? {};
    const changes: Record<string, SyncEntry | null> = {};
    if (!revisions[keep] || snapshot.legacyFields.includes(key)) changes[keep] = winner;
    if (snapshot.legacyFields.includes(key)) { changes.value = null; changes.updatedAt = null; changes.deviceId = null; }
    // Remove only revisions observed in this read; concurrent new revisions remain intact.
    for (const id of Object.keys(revisions)) if (id !== keep) changes[id] = null;
    if (Object.keys(changes).length) patch[key] = changes;
    projected[key] = { [keep]: winner };
  }
  if (Buffer.byteLength(JSON.stringify({ ...metadata, [METADATA_KEY]: { version: 2, entries: projected } })) > 7000) {
    throw new Error("Your account's settings storage is full. Local changes are kept on this device.");
  }
  return patch;
}
