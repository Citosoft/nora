import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PushNotificationsValue, PushRegistrationStatus } from "@/types/pushNotifications.types";
import { usePreferences } from "@/hooks/usePreferences";
import { pushNotifications } from "@/platform/pushNotifications";
import { subscribeToForeground } from "@/platform/foregroundSignals";
import { RemoteAccessContext } from "./remoteAccessContext";

export const PushNotificationsContext = createContext<PushNotificationsValue | null>(null);

const OFF: PushRegistrationStatus = { kind: "off" };
const UNSUPPORTED: PushRegistrationStatus = { kind: "unsupported" };

/**
 * Keeps this phone registered for notifications while the setting is on: after sign-in, when the push token rotates and
 * when the app returns to the foreground (the user may have changed the permission in system settings). Only an explicit
 * switch-off or sign-out unregisters, so a launch that has not loaded preferences yet never removes the phone.
 */
export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const push = useContext(RemoteAccessContext)?.push ?? null;
  const { preferences, update } = usePreferences();
  const enabled = preferences.pushNotificationsEnabled;
  const supported = push !== null && pushNotifications.platform !== null;
  const [status, setStatus] = useState<PushRegistrationStatus>(supported ? OFF : UNSUPPORTED);
  const [busy, setBusy] = useState(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!push || !supported) { setStatus(UNSUPPORTED); return undefined; }
    if (!enabled) { setStatus(OFF); return undefined; }
    let current = true;
    const resync = (): void => {
      if (!enabledRef.current) return;
      void push.sync(true).then((next) => { if (current) setStatus(next); });
    };
    resync();
    const stopToken = pushNotifications.onTokenChange(resync);
    const stopForeground = subscribeToForeground(resync);
    return () => { current = false; stopToken(); stopForeground(); };
  }, [push, supported, enabled]);

  const setEnabled = useCallback(async (next: boolean): Promise<void> => {
    if (!push || !supported) return;
    setBusy(true);
    try {
      if (next) {
        const result = await push.enable();
        setStatus(result);
        if (result.kind === "registered") await update((current) => ({ ...current, pushNotificationsEnabled: true }));
      } else {
        await update((current) => ({ ...current, pushNotificationsEnabled: false }));
        setStatus(await push.sync(false));
      }
    } finally {
      setBusy(false);
    }
  }, [push, supported, update]);

  const value = useMemo<PushNotificationsValue>(() => ({ supported, enabled, status, busy, setEnabled }), [supported, enabled, status, busy, setEnabled]);
  return <PushNotificationsContext.Provider value={value}>{children}</PushNotificationsContext.Provider>;
}
