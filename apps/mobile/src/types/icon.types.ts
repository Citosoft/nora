import type { ComponentProps } from "react";
import type Ionicons from "@expo/vector-icons/Ionicons";

/** Ionicons glyph names; the shared `Icon` component is the only place that renders them. */
export type IconName = ComponentProps<typeof Ionicons>["name"];

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
}
