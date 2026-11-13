import type { z } from "zod";
import type { appearanceSchema, portableSettingsSchema, syncEntrySchema, syncEntriesSchema, syncDocumentSchema, syncStateSchema, syncRequestSchema, syncAppliedSchema } from "@shared/settings-sync/contracts";

export type PortableAppearance = z.infer<typeof appearanceSchema>;
export type PortableSettings = z.infer<typeof portableSettingsSchema>;
export type SettingKey = keyof PortableSettings;
export type SyncEntry = z.infer<typeof syncEntrySchema>;
export type SyncEntries = z.infer<typeof syncEntriesSchema>;
export type SyncDocument = z.infer<typeof syncDocumentSchema>;
export type SettingsSyncState = z.infer<typeof syncStateSchema>;
export type SettingsSyncRequest = z.infer<typeof syncRequestSchema>;
export type SettingsSyncApplied = z.infer<typeof syncAppliedSchema>;
export interface SettingsSyncBridge {
  request(input: SettingsSyncRequest): Promise<SettingsSyncState>;
  onChanged(listener: (state: SettingsSyncState) => void): () => void;
  onApplied(listener: (input: SettingsSyncApplied) => void): () => void;
}
