import { View } from "react-native";
import type { BotAvatarSpec } from "@/types/bot.types";

const paletteColors: Record<NonNullable<BotAvatarSpec["palette"]>, string> = {
  violet: "#8B6CEF", teal: "#2BA59B", coral: "#F07A62", pink: "#E46AA7", blue: "#4C8DF0", green: "#3DAA6B", amber: "#E6A23C",
  indigo: "#5C6BD6", lime: "#8DBF3A", slate: "#6B7A89"
};
const fallbackPalette = Object.values(paletteColors);

/**
 * A compact native rendering of the bot's configured avatar (palette, rounded shape and eyes) shown beside its name,
 * so bots stay recognisable without the desktop's SVG renderer.
 */
export function BotAvatar({ avatar, name, size = 24 }: { avatar: BotAvatarSpec; name: string; size?: number }) {
  const color = avatar.palette ? paletteColors[avatar.palette] : fallbackPalette[avatar.seed % fallbackPalette.length] ?? "#6B7A89";
  const radius = avatar.shape === "squircle" || avatar.shape === "shield" ? size * 0.3 : avatar.shape === "pill" ? size * 0.35 : size / 2;
  const eye = Math.max(2, Math.round(size / 8));
  return (
    <View accessibilityLabel={`${name}'s avatar`} accessibilityRole="image"
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: color, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: eye }}>
      <View style={{ width: eye, height: avatar.eyes === "oval" ? eye * 1.6 : eye, borderRadius: eye, backgroundColor: "#FFFFFF" }} />
      <View style={{ width: eye, height: avatar.eyes === "oval" ? eye * 1.6 : eye, borderRadius: eye, backgroundColor: "#FFFFFF" }} />
    </View>
  );
}
