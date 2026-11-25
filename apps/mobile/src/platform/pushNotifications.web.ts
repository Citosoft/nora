import type { PushNotificationsPlatform } from "@/types/pushNotifications.types";

/** Web: no push (the PWA does not register a push subscription), so every operation is a no-op. */
export const pushNotifications: PushNotificationsPlatform = {
  platform: null,
  configure() {
    // Intentionally empty.
  },
  getPermission: async () => "denied",
  requestPermission: async () => "denied",
  getToken: async () => {
    throw new Error("Notifications aren't available on the web.");
  },
  onTokenChange: () => () => undefined,
  onTap: () => () => undefined
};
