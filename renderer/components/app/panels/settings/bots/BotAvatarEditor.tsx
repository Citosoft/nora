import { RefreshCw } from "lucide-react";
import { BOT_AVATAR_EYES, BOT_AVATAR_PALETTES, BOT_AVATAR_SHAPES } from "@shared/bots/contracts";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { randomBotAvatarSeed } from "@/components/app/logic/bot-avatar/resolve";
import { BotAvatarPartPreview } from "@/components/app/shared/BotAvatarPartPreview";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { BotAvatarEditorProps, BotAvatarOptionLabelProps } from "@/components/app/types/botEditor.types";
import type { BotAvatar as BotAvatarValue } from "@shared/types/bots/bots.types";

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
const EYE_LABELS = { dot: "Dots", oval: "Tall ovals", pupil: "Pupils" } as const;

/** Reroll draws every unpinned part from a new seed; each select pins one part or returns it to the seed. */
export function BotAvatarEditor({ avatar, disabled, onChange }: BotAvatarEditorProps) {
  const pin = <K extends "shape" | "palette" | "eyes">(key: K, value: string, values: readonly NonNullable<BotAvatarValue[K]>[]): void => {
    const next: BotAvatarValue = { ...avatar };
    const chosen = values.find((entry) => entry === value);
    if (chosen) next[key] = chosen; else delete next[key];
    onChange(next);
  };
  return <div className="flex items-center gap-4">
    <BotAvatar avatar={avatar} size={72} label="Avatar preview" className="shrink-0" />
    <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
      <Select aria-label="Avatar shape" value={avatar.shape ?? ""} disabled={disabled} onChange={(event) => pin("shape", event.target.value, BOT_AVATAR_SHAPES)}>
        <option value=""><BotAvatarOptionLabel part={{ kind: "seed" }} label="Any shape" /></option>
        {BOT_AVATAR_SHAPES.map((shape) => <option key={shape} value={shape}><BotAvatarOptionLabel part={{ kind: "shape", shape }} label={capitalize(shape)} /></option>)}
      </Select>
      <Select aria-label="Avatar colour" value={avatar.palette ?? ""} disabled={disabled} onChange={(event) => pin("palette", event.target.value, BOT_AVATAR_PALETTES)}>
        <option value=""><BotAvatarOptionLabel part={{ kind: "seed" }} label="Any colour" /></option>
        {BOT_AVATAR_PALETTES.map((palette) => <option key={palette} value={palette}><BotAvatarOptionLabel part={{ kind: "palette", palette }} label={capitalize(palette)} /></option>)}
      </Select>
      <Select aria-label="Avatar eyes" value={avatar.eyes ?? ""} disabled={disabled} onChange={(event) => pin("eyes", event.target.value, BOT_AVATAR_EYES)}>
        <option value=""><BotAvatarOptionLabel part={{ kind: "seed" }} label="Any eyes" /></option>
        {BOT_AVATAR_EYES.map((eyes) => <option key={eyes} value={eyes}><BotAvatarOptionLabel part={{ kind: "eyes", eyes }} label={EYE_LABELS[eyes]} /></option>)}
      </Select>
      <Button type="button" variant="outline" size="sm" className="h-10" disabled={disabled}
        onClick={() => onChange({ ...avatar, seed: randomBotAvatarSeed() })}><RefreshCw className="size-3.5" aria-hidden="true" />Reroll</Button>
    </div>
  </div>;
}

/** The part on its own beside the option's text; "Any" options show a shuffle mark because the seed decides. */
function BotAvatarOptionLabel({ part, label }: BotAvatarOptionLabelProps) {
  return <span className="flex min-w-0 items-center gap-2"><BotAvatarPartPreview part={part} size={18} /><span className="truncate">{label}</span></span>;
}
