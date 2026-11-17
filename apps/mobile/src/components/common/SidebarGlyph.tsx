import { View } from "react-native";

/** The "sidebar" symbol (a rounded window with a left pane), drawn with views because the icon font has no equivalent. */
export function SidebarGlyph({ color, size = 24 }: { color: string; size?: number }) {
  const stroke = Math.max(1.6, size / 13);
  return (
    <View accessible={false} style={{ width: size, height: size * 0.82, borderRadius: size * 0.24, borderWidth: stroke, borderColor: color, padding: size * 0.14 }}>
      <View style={{ width: stroke, flex: 1, borderRadius: stroke, backgroundColor: color, marginLeft: size * 0.04 }} />
    </View>
  );
}
