import type { z } from "zod";
import type { syncStoreSchema, journalSchema } from "@main/settings-sync/journal";
import type { AppSettings } from "@shared/appTypes";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { PortableSettings, SettingsSyncApplied, SettingsSyncRequest, SettingsSyncState } from "@shared/types/settings-sync/sync.types";
import type { SettingsCloudClient, SyncSession } from "./client.types";

export type SyncJournal = z.infer<typeof journalSchema>;
export type SyncStore = z.infer<typeof syncStoreSchema>;
export interface SyncEngineDeps {
  client: SettingsCloudClient;
  journal: SyncJournal;
  deviceId: string;
  session: SyncSession;
  signal: AbortSignal;
  now(): number;
  readLocal(): PortableSettings;
  persist(): Promise<void>;
  apply(values: Partial<PortableSettings>, expected: PortableSettings): Promise<PortableSettings>;
}
export interface SyncServiceOptions {
  client: SettingsCloudClient;
  path: string;
  session(): SyncSession | null;
  readSettings(): AppSettings;
  updateSettings(change: (settings: AppSettings) => AppSettings): Promise<AppSettings>;
  providers(): readonly NativeProvider[];
  onSettingsApplied(): void;
  notify(state: SettingsSyncState): void;
  applied(input: SettingsSyncApplied): void;
}
export interface SettingsSyncService {
  initialize(): Promise<void>;
  sessionChanged(): void;
  localChanged(): void;
  request(input: SettingsSyncRequest): Promise<SettingsSyncState>;
  dispose(): Promise<void>;
}
