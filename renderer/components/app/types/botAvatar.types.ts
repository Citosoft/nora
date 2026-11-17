import type { BotAvatar, BotAvatarEyes, BotAvatarPalette, BotAvatarShape } from "@shared/types/bots/bots.types";

/** Activity an avatar's eyes express; maps from thread or run state. */
export type BotAvatarState = "idle" | "thinking" | "speaking" | "waiting" | "failed" | "settled";
export type BotAvatarPoint = readonly [number, number];
export interface BotShapeSpec {
  points(): BotAvatarPoint[];
  /** Moves and scales the face so it sits inside shapes whose visual centre is off-centre. */
  faceOffsetY?: number;
  faceScale?: number;
}
export interface BotShapeGeometry { path: string; faceOffsetY: number; faceScale: number; }
/** Seed-driven face traits: which eyes, how far apart, and when the idle blink falls. */
export interface BotFaceStyle { eyes: NonNullable<BotAvatar["eyes"]>; gap: number; blinkDelaySeconds: number; }
export type BotFaceEyeShape =
  | { kind: "rect"; x: number; y: number; width: number; height: number; rx: number }
  | { kind: "circle"; cx: number; cy: number; r: number };
/** Filled eyes while the bot is active, or a pair of stroked lines once it has failed or settled. */
export type BotFaceEyes =
  | { kind: "open"; eyes: readonly [BotFaceEyeShape, BotFaceEyeShape] }
  | { kind: "line"; paths: readonly [string, string] };
/** Two-stop ramp: `deep` reads on light surfaces, `light` on dark ones. */
export interface BotAvatarPaletteColors { light: string; deep: string; }
export interface BotAvatarProps {
  avatar: BotAvatar;
  state?: BotAvatarState;
  size: number;
  /** Accessible name; omit when an adjacent label already names the bot. */
  label?: string;
  className?: string;
}
export interface BotFaceEyesProps { eyes: BotFaceEyes; }
export interface BotAvatarStackProps {
  members: readonly { botId: string; avatar: BotAvatar }[];
  size: number;
  /** Names the group for assistive technology, e.g. "Group: Ada, Rex and Moss". */
  label: string;
  className?: string;
}
/** One part of an avatar on its own, as shown beside picker options; "seed" stands for an unpinned part. */
export type BotAvatarPart =
  | { kind: "shape"; shape: BotAvatarShape }
  | { kind: "palette"; palette: BotAvatarPalette }
  | { kind: "eyes"; eyes: BotAvatarEyes }
  | { kind: "seed" };
export interface BotAvatarPartPreviewProps { part: BotAvatarPart; size: number; }
export type { BotAvatarShape };
