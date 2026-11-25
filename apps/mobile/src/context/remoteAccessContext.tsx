import { createContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useAppAccount } from "@/hooks/useAppAccount";
import { useDemoMode } from "@/hooks/useDemoMode";
import { createDemoServices } from "@/demo/services";
import type { RemoteAccessServices } from "@/types/remoteAccess.types";
import { appConfig } from "@/config/appConfig";
import { usePreferencesStore } from "@/hooks/usePreferences";
import { keyValueStorage } from "@/platform/keyValueStorage";
import { createId } from "@/platform/randomId";
import { subscribeToForeground } from "@/platform/foregroundSignals";
import { createRemoteAccessServices } from "@/session/createRemoteAccessServices";
import { pushNotifications } from "@/platform/pushNotifications";

export const RemoteAccessContext = createContext<RemoteAccessServices | null>(null);

/** Provides signed-in services for the current Clerk user, or null while signed out. */
export function RemoteAccessProvider({ children }: { children: ReactNode }) {
  const { status, userId, getToken } = useAppAccount();
  const demo = useDemoMode();
  const preferences = usePreferencesStore();
  // Clerk's `getToken` returns a fresh (auto-refreshed) session token; keep the latest function without rebuilding services.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const activeUserId = status === "signed-in" && userId ? userId : null;

  const services = useMemo(() => demo.active ? createDemoServices(demo.storage, preferences, createId) : activeUserId ? createRemoteAccessServices({
    userId: activeUserId,
    getToken: () => getTokenRef.current(),
    controlPlaneUrl: appConfig.controlPlaneUrl,
    storage: keyValueStorage,
    preferences,
    createId,
    pushNotifications
  }) : null, [activeUserId, demo.active, demo.storage, preferences]);

  useEffect(() => {
    if (!services) return undefined;
    const unsubscribe = subscribeToForeground(() => services.sessions.resumeAll());
    return () => {
      unsubscribe();
      services.sessions.disposeAll();
    };
  }, [services]);

  return <RemoteAccessContext.Provider value={services}>{children}</RemoteAccessContext.Provider>;
}
