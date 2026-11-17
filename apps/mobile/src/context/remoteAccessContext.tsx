import { createContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useAuth } from "@clerk/expo";
import type { RemoteAccessServices } from "@/types/remoteAccess.types";
import { appConfig } from "@/config/appConfig";
import { usePreferencesStore } from "@/hooks/usePreferences";
import { keyValueStorage } from "@/platform/keyValueStorage";
import { createId } from "@/platform/randomId";
import { subscribeToForeground } from "@/platform/foregroundSignals";
import { createRemoteAccessServices } from "@/session/createRemoteAccessServices";

export const RemoteAccessContext = createContext<RemoteAccessServices | null>(null);

/** Provides signed-in services for the current Clerk user, or null while signed out. */
export function RemoteAccessProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, userId, getToken } = useAuth();
  const preferences = usePreferencesStore();
  // Clerk's `getToken` returns a fresh (auto-refreshed) session token; keep the latest function without rebuilding services.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const activeUserId = isSignedIn && userId ? userId : null;

  const services = useMemo(() => activeUserId ? createRemoteAccessServices({
    userId: activeUserId,
    getToken: () => getTokenRef.current(),
    controlPlaneUrl: appConfig.controlPlaneUrl,
    storage: keyValueStorage,
    preferences,
    createId
  }) : null, [activeUserId, preferences]);

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
