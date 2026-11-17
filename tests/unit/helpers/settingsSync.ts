import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { captureSettings } from "@main/settings-sync/preferences";
import type { PortableAppearance, PortableSettings, SyncDocument } from "@shared/types/settings-sync/sync.types";
import type { SyncEngineDeps, SyncJournal } from "@main/types/settings-sync/service.types";
import { mergeEntries } from "@shared/settings-sync/entries";

export const syncAppearance: PortableAppearance = { themeMode: "system", accentColor: "silver", uiFontId: "system", terminalThemeId: "app", terminalFontId: "ibm-plex-mono", userDisplayName: "Daniel" };
export function syncPreferences(): PortableSettings { return captureSettings(structuredClone(DEFAULT_APP_SETTINGS), syncAppearance); }
export function syncFixture() {
  let local = syncPreferences();
  let cloud: SyncDocument | null = null;
  let time = 1000;
  let writes = 0;
  const journal: SyncJournal = { enabled: true, initialized: false, seedLocal: true, clock: 0, baseline: structuredClone(local), pending: {}, lastSyncedAt: null };
  const controller = new AbortController();
  const deps: SyncEngineDeps = { journal, deviceId: "device-a", session: { userId: "user-a", sessionId: "session-a" }, signal: controller.signal,
    now: () => ++time, readLocal: () => structuredClone(local), persist: async () => {},
    apply: async (values) => { local = { ...local, ...values }; return structuredClone(local); },
    client: { read: async () => cloud, write: async (_session, entries) => { writes++; cloud = { version: 1, entries: mergeEntries(cloud?.entries ?? {}, entries) }; return cloud; } }
  };
  return { deps, journal, controller, local: () => local, cloud: () => cloud, writes: () => writes,
    edit: (values: Partial<PortableSettings>) => { local = { ...local, ...values }; },
    setCloud: (document: SyncDocument | null) => { cloud = document; }
  };
}
