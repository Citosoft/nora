import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import type { ThinkingOrbProps } from "@/types/thinkingOrb.types";
import { orbDuration, orbMarks, orbSize } from "@/visuals/thinkingOrb";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/hooks/useTheme";

/** Native drawing of the same dotted geometry as desktop, without React updates per frame. */
export const ThinkingOrb = memo(function ThinkingOrb({ state }: ThinkingOrbProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const marks = useMemo(() => orbMarks(state, reduced), [state, reduced]);
  return <View style={styles.orb} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
    {marks.map((mark, index) => <Animated.View key={`${state}:${index}`} style={[
      styles.mark, { backgroundColor: colors.text }, mark.initial,
      !reduced && { animationName: mark.keyframes, animationDuration: orbDuration, animationIterationCount: "infinite",
        animationDirection: "alternate", animationTimingFunction: "linear" }
    ]} />)}
  </View>;
});

const styles = StyleSheet.create({
  orb: { width: orbSize, height: orbSize, flexShrink: 0 },
  mark: { position: "absolute", left: 0, top: 0, width: 2, height: 2, borderRadius: 1 }
});
