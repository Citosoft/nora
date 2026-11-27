import { BOT_AVATAR_PALETTES, BOT_AVATAR_SHAPES } from "@shared/bots/contracts";
import type { AppImportBot } from "@shared/types/app-import/appImportPlan.types";
import type { BotAvatar, BotAvatarPalette, BotAvatarShape } from "@shared/types/bots/bots.types";

/** Source shape names Nora draws differently, mapped to the closest Nora shape. */
const SHAPE_ALIASES: Readonly<Record<string, BotAvatarShape>> = {
  hex: "hexagon", blob: "pebble", bean: "pill", capsule: "pill", gem: "sparkle", crystal: "sparkle", wedge: "triangle", arch: "shield", dome: "drop"
};

const PALETTE_RGB: Readonly<Record<BotAvatarPalette, readonly [number, number, number]>> = {
  violet: [139, 92, 246], teal: [20, 184, 166], coral: [249, 115, 98], pink: [236, 72, 153], blue: [59, 130, 246],
  green: [34, 197, 94], amber: [245, 158, 11], indigo: [99, 102, 241], lime: [132, 204, 22], slate: [100, 116, 139]
};

export function appImportAvatarShape(name: string | null | undefined): BotAvatarShape | null {
  const key = name?.trim().toLowerCase() ?? "";
  if (!key) return null;
  return (BOT_AVATAR_SHAPES as readonly string[]).includes(key) ? key as BotAvatarShape : SHAPE_ALIASES[key] ?? null;
}

function hexRgb(value: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match?.[1]) return null;
  const hex = match[1].length === 3 ? match[1].split("").map((digit) => digit + digit).join("") : match[1];
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

/** A palette name as-is, or the nearest Nora palette to a hex colour. */
export function appImportAvatarPalette(color: string | null | undefined): BotAvatarPalette | null {
  const key = color?.trim().toLowerCase() ?? "";
  if (!key) return null;
  if ((BOT_AVATAR_PALETTES as readonly string[]).includes(key)) return key as BotAvatarPalette;
  const rgb = hexRgb(key);
  if (!rgb) return null;
  let best: BotAvatarPalette | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const palette of BOT_AVATAR_PALETTES) {
    const [r, g, b] = PALETTE_RGB[palette];
    const distance = (r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2;
    if (distance < bestDistance) { best = palette; bestDistance = distance; }
  }
  return best;
}

/** FNV-1a over the import key, so a bot gets the same face in the preview, after import and on every re-run. */
function seedFor(importKey: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < importKey.length; index += 1) hash = Math.imul(hash ^ importKey.charCodeAt(index), 0x01000193) >>> 0;
  return hash % 2_147_483_646;
}

export function appImportBotAvatar(bot: Pick<AppImportBot, "importKey" | "avatar">): BotAvatar {
  return { seed: seedFor(bot.importKey), ...(bot.avatar.shape ? { shape: bot.avatar.shape } : {}), ...(bot.avatar.palette ? { palette: bot.avatar.palette } : {}) };
}
