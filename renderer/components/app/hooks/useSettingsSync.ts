import { useEffect, useState } from "react";
import { settingsSyncClient } from "@/components/app/clients/settingsSyncClient";
import type { SettingsSyncState, SettingsSyncRequest } from "@shared/types/settings-sync/sync.types";
import type { SettingsSyncController } from "@/components/app/types/settingsSync.types";

export function useSettingsSync(): SettingsSyncController {
  const [state, setState] = useState<SettingsSyncState>({ enabled: false, phase: "off", lastSyncedAt: null, message: null });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true; let pushed = false;
    const unsubscribe = settingsSyncClient.onChanged((next) => { pushed = true; if (active) setState(next); });
    void settingsSyncClient.request({ kind: "read" }).then((next) => { if (active && !pushed) setState(next); }).catch(() => { if (active) setError("Sync status is unavailable."); });
    return () => { active = false; unsubscribe(); };
  }, []);
  const request = (input: SettingsSyncRequest): void => {
    setError(null);
    void settingsSyncClient.request(input).then(setState).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Settings could not sync."));
  };
  return { state, error, setEnabled: (enabled) => request({ kind: "set-enabled", enabled }), sync: () => request({ kind: "sync" }) };
}
