import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useAppAccount } from "@/hooks/useAppAccount";
import { skipDefaultRuntimeOpen } from "@/hooks/useOpenDefaultRuntimeOnce";
import { pushNotifications } from "@/platform/pushNotifications";
import { pushTapHref } from "@/push/pushTaps";

/**
 * Opens what a tapped notification points at. A tap that arrives before sign-in finishes (including the one that
 * launched the app) waits until the account is signed in; demo mode never follows real notifications.
 */
export function usePushNotificationTaps(): void {
  const account = useAppAccount();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => pushNotifications.onTap((data) => {
    const href = pushTapHref(data);
    if (href) setPendingHref(href);
  }), []);

  useEffect(() => {
    if (pendingHref === null || account.status !== "signed-in") return;
    setPendingHref(null);
    // The tapped thread wins over "Open at launch".
    skipDefaultRuntimeOpen();
    router.push(pendingHref);
  }, [pendingHref, account.status]);
}
