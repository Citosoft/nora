import { BOT_AVATAR_EYES, BOT_AVATAR_PALETTES, BOT_AVATAR_SHAPES } from "@shared/bots/contracts";
import type { BotAvatar, ResolvedBotAvatar } from "@shared/types/bots/bots.types";
import type { BotEyeStyleInput } from "@/components/app/types/botAvatar.types";

/** Mulberry32: small, deterministic and well mixed even for neighbouring seeds, so a seed always draws the same bot. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
const pick = <T,>(values: readonly T[], next: () => number): T => values[Math.floor(next() * values.length)];

/** Unpinned parts come from the seed in a fixed order, so pinning one part never changes the others. */
export function resolveBotAvatar(avatar: BotAvatar): ResolvedBotAvatar {
  const next = seeded(avatar.seed);
  const shape = pick(BOT_AVATAR_SHAPES, next), palette = pick(BOT_AVATAR_PALETTES, next), eyes = pick(BOT_AVATAR_EYES, next);
  return { seed: avatar.seed, shape: avatar.shape ?? shape, palette: avatar.palette ?? palette, eyes: avatar.eyes ?? eyes };
}

export function botEyeStyle(avatar: ResolvedBotAvatar): BotEyeStyleInput {
  const next = seeded(avatar.seed ^ 0x5bd1e995);
  return { eyes: avatar.eyes, gap: 8 + next() * 3, blinkPhase: next() * 4, glanceDirection: next() < 0.5 ? -1 : 1 };
}

export function randomBotAvatarSeed(): number { return Math.floor(Math.random() * 2_147_483_646); }
