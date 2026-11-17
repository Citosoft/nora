import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { layout } from "@/theme/tokens";

interface BarIconButtonProps {
  label: string;
  onPress: () => void;
  children: ReactNode;
  disabled?: boolean;
}

/** A bare glyph with a full touch target, as in ChatGPT's top bar and sidebar header. */
export function BarIconButton({ label, onPress, children, disabled = false }: BarIconButtonProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={6}
      style={({ pressed }) => ({ width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: "center", justifyContent: "center",
        opacity: disabled ? 0.35 : pressed ? 0.5 : 1 })}>
      {children}
    </Pressable>
  );
}
