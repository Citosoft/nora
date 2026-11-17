import type { ViewStyle } from "react-native";

/** Native: bars use the translucent chrome colour alone (a blur view can replace this when native builds ship). */
export const glassStyle: ViewStyle = { overflow: "hidden" };
