import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { z } from "zod";
import type { PushPlatform } from "@shared/types/remote-access/push.types";
import type { PushNotificationsPlatform, PushPermission } from "@/types/pushNotifications.types";

/** Must match the `channelId` the control plane sends with every message. */
const ANDROID_CHANNEL_ID = "default";

const easExtraSchema = z.object({ eas: z.object({ projectId: z.string().min(1) }) });

function easProjectId(): string {
  const fromBuild = Constants.easConfig?.projectId;
  if (fromBuild) return fromBuild;
  const extra = easExtraSchema.safeParse(Constants.expoConfig?.extra);
  if (extra.success) return extra.data.eas.projectId;
  throw new Error("This build has no EAS project ID, so it cannot receive notifications.");
}

function nativePlatform(): PushPlatform | null {
  // Simulators and emulators cannot get a real push token.
  if (!Device.isDevice) return null;
  if (Platform.OS === "ios") return "ios";
  // Android tokens come from Firebase; a build without `android.googleServicesFile` cannot get one, so hide the setting.
  if (Platform.OS === "android") return Constants.expoConfig?.android?.googleServicesFile ? "android" : null;
  return null;
}

function toPermission(status: Notifications.NotificationPermissionsStatus): PushPermission {
  if (status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return "granted";
  if (status.status === "denied") return "denied";
  // Undetermined but no longer askable (Android after repeated refusals) behaves like denied: only Settings can fix it.
  return status.canAskAgain ? "undetermined" : "denied";
}

let configured = false;
/** Identifiers of taps already delivered, so the launch tap is not delivered again by the live listener or a remount. */
const deliveredTaps = new Set<string>();

function tapKey(response: Notifications.NotificationResponse): string {
  return `${response.notification.request.identifier}:${response.notification.date}`;
}

/** Native: Expo push through `expo-notifications`. */
export const pushNotifications: PushNotificationsPlatform = {
  platform: nativePlatform(),
  configure() {
    if (configured) return;
    configured = true;
    // Show notifications while the app is open too; the user may be on another computer's screen.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false })
    });
    if (Platform.OS === "android") {
      void Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: "Nora", importance: Notifications.AndroidImportance.HIGH
      }).catch(() => undefined);
    }
  },
  async getPermission() {
    return toPermission(await Notifications.getPermissionsAsync());
  },
  async requestPermission() {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || !current.canAskAgain) return toPermission(current);
    return toPermission(await Notifications.requestPermissionsAsync());
  },
  async getToken() {
    return (await Notifications.getExpoPushTokenAsync({ projectId: easProjectId() })).data;
  },
  onTokenChange(listener) {
    const subscription = Notifications.addPushTokenListener(() => listener());
    return () => subscription.remove();
  },
  onTap(listener) {
    const deliver = (response: Notifications.NotificationResponse | null): void => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const key = tapKey(response);
      if (deliveredTaps.has(key)) return;
      deliveredTaps.add(key);
      listener(response.notification.request.content.data);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(deliver);
    // Cold start: the tap that launched the app arrived before anything was listening.
    deliver(Notifications.getLastNotificationResponse());
    return () => subscription.remove();
  }
};
