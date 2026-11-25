import { useContext } from "react";
import type { PushNotificationsValue } from "@/types/pushNotifications.types";
import { PushNotificationsContext } from "@/context/pushNotificationsContext";

export function usePushNotifications(): PushNotificationsValue {
  const value = useContext(PushNotificationsContext);
  if (!value) throw new Error("usePushNotifications must be used inside PushNotificationsProvider");
  return value;
}
