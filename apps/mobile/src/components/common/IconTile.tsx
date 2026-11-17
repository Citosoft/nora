import { View } from "react-native";
import type { IconTileSpec } from "@/types/listUi.types";
import { layout, radii } from "@/theme/tokens";
import { Icon } from "./Icon";

/** Settings-style rounded square with a white glyph, leading a list row. */
export function IconTile({ icon, color, size = layout.iconTile }: IconTileSpec & { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radii.xs + 1, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={Math.round(size * 0.6)} color="#FFFFFF" />
    </View>
  );
}
