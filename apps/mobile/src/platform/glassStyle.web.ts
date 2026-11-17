import type { ViewStyle } from "react-native";

/**
 * Web: iOS-style frosted chrome via CSS backdrop filters (react-native-web passes them through). React Native's
 * `ViewStyle` has no `backdropFilter`, so the CSS-only properties are added on a non-literal object.
 */
const frosted = { overflow: "hidden" as const, backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)" };

export const glassStyle: ViewStyle = frosted;
