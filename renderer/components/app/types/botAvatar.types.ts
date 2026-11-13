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
export interface BotEyeStyleInput { eyes: NonNullable<BotAvatar["eyes"]>; gap: number; blinkPhase: number; glanceDirection: -1 | 1; }
export type BotEye =
  | { kind: "solid"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "pupil"; cx: number; cy: number; r: number; squash: number; pupil: { cx: number; cy: number; r: number } | null }
  | { kind: "lower-half"; cx: number; cy: number; rx: number; ry: number; white: boolean; pupil: { cx: number; cy: number; r: number } | null }
  | { kind: "closed"; cx: number; cy: number; width: number };
export interface BotFaceFrame { eyes: readonly [BotEye, BotEye]; sleep: { x: number; y: number; opacity: number } | null; }
export interface BotAvatarPaletteColors { fill: string; ink: string; }
export interface BotAvatarProps {
  avatar: BotAvatar;
  state?: BotAvatarState;
  size: number;
  /** Accessible name; omit when an adjacent label already names the bot. */
  label?: string;
  className?: string;
}
export interface BotFaceProps { style: BotEyeStyleInput; state: BotAvatarState; ink: string; }
export interface BotEyeShapeProps { eye: BotEye; ink: string; whiteStroke?: string; }
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
