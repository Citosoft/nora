import type { BotAvatarPalette } from "@shared/types/bots/bots.types";
import type { BotAvatarPaletteColors } from "@/components/app/types/botAvatar.types";

/** Fixed fills with their darkest stop as eye ink, so avatars read the same on light and dark themes. */
export const BOT_AVATAR_PALETTE_COLORS: Readonly<Record<BotAvatarPalette, BotAvatarPaletteColors>> = {
  violet: { fill: "#AFA9EC", ink: "#26215C" },
  teal: { fill: "#5DCAA5", ink: "#04342C" },
  coral: { fill: "#F0997B", ink: "#4A1B0C" },
  pink: { fill: "#ED93B1", ink: "#4B1528" },
  blue: { fill: "#85B7EB", ink: "#042C53" },
  green: { fill: "#97C459", ink: "#173404" },
  amber: { fill: "#FAC775", ink: "#412402" },
  lilac: { fill: "#CECBF6", ink: "#26215C" },
  mint: { fill: "#9FE1CB", ink: "#04342C" },
  peach: { fill: "#F5C4B3", ink: "#4A1B0C" }
};
