import { Platform } from "react-native";

/** Names this device for the desktop's device list, e.g. "iPhone · Nora app"; shown there as plain text. */
export function describeThisDevice(): string | null {
  if (Platform.OS === "ios") return `${Platform.isPad ? "iPad" : "iPhone"} · Nora app`;
  if (Platform.OS === "android") {
    const model = Platform.constants.Model.replace(/[^\p{L}\p{N} ._+-]/gu, "").trim().slice(0, 32);
    return `${model || "Android"} · Nora app`;
  }
  return null;
}
