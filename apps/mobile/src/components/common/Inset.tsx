import type { ReactNode } from "react";
import { View } from "react-native";
import { layout, spacing } from "@/theme/tokens";

/** Aligns free-standing content (banners, notes, buttons) with inset grouped sections on grouped screens. */
export function Inset({ children }: { children: ReactNode }) {
  return <View style={{ paddingHorizontal: layout.gutter, gap: spacing.sm }}>{children}</View>;
}
