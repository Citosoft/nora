import { Shuffle } from "lucide-react";
import { botShapeGeometry } from "@/components/app/logic/bot-avatar/shapes";
import { botFaceFrame } from "@/components/app/logic/bot-avatar/face";
import { BOT_AVATAR_PALETTE_COLORS } from "@/components/app/constants/botAvatarPalettes";
import { BotEyeShape } from "./BotEyeShape";
import type { BotAvatarPartPreviewProps } from "@/components/app/types/botAvatar.types";

/** Open eyes at rest, framed tightly so the pair fills the preview. */
const EYES_VIEWBOX = "32 32 36 36";
const EYES_TIME = 1;

/** Just one part of an avatar: a plain silhouette, a colour swatch or a pair of eyes. Decorative; the option text names the choice. */
export function BotAvatarPartPreview({ part, size }: BotAvatarPartPreviewProps) {
  const svg = { width: size, height: size, "aria-hidden": true, className: "shrink-0" } as const;
  switch (part.kind) {
    case "shape": return <svg {...svg} viewBox="0 0 100 100"><path d={botShapeGeometry(part.shape).path} fill="hsl(var(--muted-foreground))" fillOpacity={0.6} /></svg>;
    case "palette": return <svg {...svg} viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill={BOT_AVATAR_PALETTE_COLORS[part.palette].fill} stroke="hsl(var(--border))" strokeWidth="4" /></svg>;
    case "eyes": {
      const frame = botFaceFrame({ eyes: part.eyes, gap: 9, blinkPhase: 0, glanceDirection: 1 }, "idle", EYES_TIME);
      return <svg {...svg} viewBox={EYES_VIEWBOX} className="shrink-0 text-foreground">
        {frame.eyes.map((eye, index) => <BotEyeShape key={index} eye={eye} ink="currentColor" whiteStroke="currentColor" />)}</svg>;
    }
    case "seed": return <Shuffle aria-hidden="true" className="shrink-0 text-muted-foreground" style={{ width: size, height: size }} />;
  }
}
