import { ThinkingOrb as WebThinkingOrb } from "thinking-orbs";
import { View } from "react-native";
import type { ThinkingOrbProps } from "@/types/thinkingOrb.types";
import { useTheme } from "@/hooks/useTheme";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function ThinkingOrb({ state }: ThinkingOrbProps) {
  const { scheme } = useTheme();
  const reduced = useReducedMotion();
  return <View pointerEvents="none" accessible={false} style={{ width: 32, height: 32 }}>
    <WebThinkingOrb state={state} size={32} theme={scheme} paused={reduced} aria-hidden />
  </View>;
}
