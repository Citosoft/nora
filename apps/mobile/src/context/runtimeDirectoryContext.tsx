import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { LoadState } from "@/types/loadState.types";
import type { RuntimeDirectoryApi, RuntimeDirectoryView } from "@/types/runtimeDirectory.types";
import { errorMessage } from "@/api/http/remoteRequestError";
import { usePreferencesStore } from "@/hooks/usePreferences";
import { useRemoteAccess } from "@/hooks/useRemoteAccess";

export const RuntimeDirectoryContext = createContext<RuntimeDirectoryApi | null>(null);

/** The signed-in user's runtimes from the Worker, falling back to the last saved list (marked cached) when it is unreachable. */
export function RuntimeDirectoryProvider({ children }: { children: ReactNode }) {
  const services = useRemoteAccess();
  const preferences = usePreferencesStore();
  const [state, setState] = useState<LoadState<RuntimeDirectoryView>>({ status: "loading" });

  const saveList = useCallback(async (runtimes: RuntimeDirectoryEntry[]) => {
    const savedAt = new Date().toISOString();
    setState({ status: "ready", value: { runtimes, source: "live", savedAt, liveError: null }, refreshing: false });
    await preferences.update((current) => ({ ...current, cachedRuntimes: { userId: services.userId, savedAt, runtimes } }));
  }, [preferences, services.userId]);

  const refresh = useCallback(async () => {
    setState((current) => current.status === "ready" ? { ...current, refreshing: true } : current);
    try {
      await saveList(await services.directory.list());
    } catch (error) {
      const cached = preferences.get().cachedRuntimes;
      const message = errorMessage(error);
      if (cached && cached.userId === services.userId) {
        setState({ status: "ready", value: { runtimes: cached.runtimes, source: "cached", savedAt: cached.savedAt, liveError: message }, refreshing: false });
      } else {
        setState({ status: "error", message, stale: null });
      }
    }
  }, [preferences, saveList, services]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const current = state.status === "ready" ? state.value.runtimes : [];
  const rename = useCallback(async (installationId: string, name: string) => {
    const updated = await services.directory.rename(installationId, name);
    await saveList(current.map((entry) => entry.installationId === installationId ? updated : entry));
  }, [current, saveList, services.directory]);

  const remove = useCallback(async (installationId: string) => {
    await services.directory.remove(installationId);
    await saveList(current.filter((entry) => entry.installationId !== installationId));
    await preferences.update((prefs) => prefs.defaultRuntimeId === installationId ? { ...prefs, defaultRuntimeId: null } : prefs);
  }, [current, preferences, saveList, services.directory]);

  const api = useMemo<RuntimeDirectoryApi>(() => ({
    state, refresh, rename, remove,
    find: (installationId) => current.find((entry) => entry.installationId === installationId) ?? null
  }), [current, refresh, remove, rename, state]);

  return <RuntimeDirectoryContext.Provider value={api}>{children}</RuntimeDirectoryContext.Provider>;
}
