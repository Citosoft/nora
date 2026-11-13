import type { TokenStorage } from "@clerk/electron";
import type { z } from "zod";
import type { metadataSchema } from "@main/settings-sync/cloudDocument";
import type { SyncDocument, SyncEntries, SyncEntry } from "@shared/types/settings-sync/sync.types";

export interface SyncSession { userId: string; sessionId: string; }
export interface SettingsCloudClient {
  read(session: SyncSession, signal: AbortSignal): Promise<SyncDocument | null>;
  write(session: SyncSession, entries: SyncEntries, signal: AbortSignal): Promise<SyncDocument>;
}
export interface ClerkSyncClientOptions {
  host: string;
  tokens: TokenStorage;
  fetch: typeof fetch;
  session(): SyncSession | null;
}
export type CloudEntries = Record<string, Record<string, SyncEntry>>;
export type CloudPatch = Record<string, Record<string, SyncEntry | null>>;
export type ClerkMetadata = z.infer<typeof metadataSchema>;
export interface CloudSnapshot { document: SyncDocument | null; entries: CloudEntries; version: 1 | 2 | null; legacyFields: string[]; }
