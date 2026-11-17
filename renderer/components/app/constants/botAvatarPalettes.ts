import type { BotAvatarPalette } from "@shared/types/bots/bots.types";
import type { BotAvatarPaletteColors } from "@/components/app/types/botAvatar.types";

/** Even-weight ramps shared with the withnora.run Line avatars, so no colour shouts over another. */
export const BOT_AVATAR_PALETTE_COLORS: Readonly<Record<BotAvatarPalette, BotAvatarPaletteColors>> = {
  green: { light: "#3DB88C", deep: "#1C7A58" },
  blue: { light: "#5A86F2", deep: "#2B50C2" },
  violet: { light: "#9479F2", deep: "#5F41C6" },
  coral: { light: "#F2876A", deep: "#C24F35" },
  amber: { light: "#EDB24C", deep: "#B87713" },
  pink: { light: "#EA74A4", deep: "#B33F6C" },
  teal: { light: "#38B2C6", deep: "#16768A" },
  slate: { light: "#7D8CA3", deep: "#46546A" },
  lime: { light: "#8DC25A", deep: "#4F8624" },
  indigo: { light: "#6A6EE8", deep: "#3638B0" }
};
