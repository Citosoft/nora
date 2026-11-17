import { AppState } from "react-native";
import type { SubscribeToForeground } from "@/types/platform.types";

/** Native: the app returning to the foreground. */
export const subscribeToForeground: SubscribeToForeground = (listener) => {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") listener();
  });
  return () => subscription.remove();
};
