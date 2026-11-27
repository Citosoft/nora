import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { islandAvatarState } from "@/components/app/logic/island/islandSummary";
import type { IslandIdentityIconProps } from "@/components/app/types/island.types";

/** Who is doing the work: a bot's face, whose eyes and ring also carry the phase, or the provider's icon. */
export function IslandIdentityIcon({ identity, phase, size }: IslandIdentityIconProps) {
  if (identity.kind === "bot") return <BotAvatar avatar={identity.avatar} state={islandAvatarState(phase)} size={size} label={identity.name} />;
  return <span className="inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
    <AgentToolIcon toolId={identity.toolId} label={identity.label} connection={identity.connection}
      className="size-full rounded-[5px] bg-white/10" imageClassName="size-[78%]" />
  </span>;
}
