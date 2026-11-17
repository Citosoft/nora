import type { AccountSession } from "@main/types/account/session.types";
import type { z } from "zod";
import type { metadataSchema } from "@main/settings-sync/cloudDocument";
import type { SyncDocument, SyncEntries, SyncEntry } from "@shared/types/settings-sync/sync.types";

export interface SettingsCloudClient {
  read(session: AccountSession, signal: AbortSignal): Promise<SyncDocument | null>;
  write(session: AccountSession, entries: SyncEntries, signal: AbortSignal): Promise<SyncDocument>;
}
export type CloudEntries = Record<string, Record<string, SyncEntry>>;
export type CloudPatch = Record<string, Record<string, SyncEntry | null>>;
export type ClerkMetadata = z.infer<typeof metadataSchema>;
export interface CloudSnapshot { document: SyncDocument | null; entries: CloudEntries; version: 1 | 2 | null; legacyFields: string[]; }
