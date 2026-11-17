import Ionicons from "@expo/vector-icons/Ionicons";
import type { IconProps } from "@/types/icon.types";

/** The app's single icon renderer (Ionicons: SF Symbols-like glyphs that work on web and native). Decorative only. */
export function Icon({ name, size = 20, color }: IconProps) {
  return <Ionicons name={name} size={size} color={color} accessible={false} importantForAccessibility="no-hide-descendants" />;
}
