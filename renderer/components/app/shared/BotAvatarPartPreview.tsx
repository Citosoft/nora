import { Shuffle } from "lucide-react";
import type { CSSProperties } from "react";
import { botShapeGeometry } from "@/components/app/logic/bot-avatar/shapes";
import { botFaceEyes } from "@/components/app/logic/bot-avatar/face";
import { BOT_AVATAR_PALETTE_COLORS } from "@/components/app/constants/botAvatarPalettes";
import { BotFaceEyes } from "./BotFaceEyes";
import type { BotAvatarPartPreviewProps } from "@/components/app/types/botAvatar.types";

/** Open eyes at rest, framed tightly so the pair fills the preview. */
const EYES_VIEWBOX = "30 30 40 40";
const EYES_GAP = 11;

/** Just one part of an avatar, drawn in the Line style: a bare outline, a colour swatch or a pair of eyes. Decorative; the option text names the choice. */
export function BotAvatarPartPreview({ part, size }: BotAvatarPartPreviewProps) {
  const svg = { width: size, height: size, "aria-hidden": true, className: "shrink-0" } as const;
  switch (part.kind) {
    case "shape": return <svg {...svg} viewBox="0 0 100 100" className="shrink-0 text-muted-foreground">
      <path d={botShapeGeometry(part.shape).path} fill="currentColor" fillOpacity={0.1} stroke="currentColor" strokeWidth={6} strokeLinejoin="round" /></svg>;
    case "palette": {
      const colors = BOT_AVATAR_PALETTE_COLORS[part.palette];
      const style = { "--bot-avatar-deep": colors.deep, "--bot-avatar-light": colors.light } as CSSProperties;
      return <svg {...svg} viewBox="0 0 100 100" className="bot-avatar shrink-0" style={style}>
      <circle cx="50" cy="50" r="36" fill="currentColor" fillOpacity={0.15} stroke="currentColor" strokeWidth="8" /></svg>;
    }
    case "eyes": return <svg {...svg} viewBox={EYES_VIEWBOX} className="shrink-0 text-foreground">
      <BotFaceEyes eyes={botFaceEyes({ eyes: part.eyes, gap: EYES_GAP }, "idle")} /></svg>;
    case "seed": return <Shuffle aria-hidden="true" className="shrink-0 text-muted-foreground" style={{ width: size, height: size }} />;
  }
}
