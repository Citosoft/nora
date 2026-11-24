import type { ViewStyle } from "react-native";
import type { CSSAnimationKeyframes } from "react-native-reanimated";
import type { OrbState } from "thinking-orbs/engine";

export interface ThinkingOrbProps { state: OrbState; }
export type OrbStyle = Pick<ViewStyle, "opacity" | "transform">;

export interface OrbMark {
  initial: OrbStyle;
  keyframes: CSSAnimationKeyframes<OrbStyle>;
}
