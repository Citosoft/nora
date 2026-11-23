import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@/theme/tokens";
import { useKeyboardOverlap } from "@/hooks/useKeyboardOverlap";

/**
 * Fills its parent and lifts its bottom edge (usually a docked composer) above the on-screen keyboard. The dock already pads
 * for the bottom safe-area inset, which the keyboard covers, so only the overlap beyond that inset is added, plus a small gap.
 */
export function KeyboardAvoidingArea({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { ref, overlap, remeasure } = useKeyboardOverlap();
  const lift = overlap > 0 ? Math.max(0, overlap - insets.bottom) + spacing.sm : 0;
  return (
    <View ref={ref} onLayout={remeasure} style={{ flex: 1, paddingBottom: lift }}>
      {children}
    </View>
  );
}
