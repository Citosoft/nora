import { useEffect, useRef } from "react";
import { settingsSyncClient } from "@/components/app/clients/settingsSyncClient";
import { mergeAppearance, readPortableAppearance } from "@/components/app/logic/account/syncedPreferences";
import type { SyncedAppearanceInput } from "@/components/app/types/settingsSync.types";

export function useSyncedAppearance(input: SyncedAppearanceInput): void {
  const latest = useRef(input);
  latest.current = input;
  const { loaded, appearance } = input;
  const serialized = JSON.stringify(appearance);
  useEffect(() => {
    if (loaded) void settingsSyncClient.request({ kind: "appearance", appearance: latest.current.appearance }).catch(() => undefined);
  }, [loaded, serialized]);
  useEffect(() => settingsSyncClient.onApplied(({ values, expected }) => {
    latest.current.apply(mergeAppearance(readPortableAppearance(), values, expected));
    latest.current.applySettings(values, expected);
  }), []);
}
