import { FilePen } from "lucide-react";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { BotAvatarStack } from "@/components/app/shared/BotAvatarStack";
import { botAvatarStateForStatus, memberList } from "@/components/app/logic/botThreads";
import type { ThreadRowIdentityProps } from "@/components/app/types/thread-workspace/list.types";

const sizes = { sm: { avatar: 20, box: "size-5", image: "size-4", glyph: "size-3.5" }, md: { avatar: 28, box: "size-7", image: "size-5", glyph: "size-4" } } as const;

export function ThreadRowIdentity({ row, providerLabel, size = "sm" }: ThreadRowIdentityProps) {
  const { avatar, box, image, glyph } = sizes[size];
  if (row.group) return <BotAvatarStack members={row.group} size={avatar} label={`Group: ${memberList(row.group.map((member) => member.name))}`} />;
  if (row.bot) return <BotAvatar avatar={row.bot.avatar} state={botAvatarStateForStatus(row.status)} size={avatar} label={row.bot.name} className="shrink-0" />;
  if (!row.providerKind) {
    // Holds the provider logo's slot so unstarted drafts line up with the rest of the list.
    if (row.target.kind !== "draft") return null;
    return <span role="img" aria-label="Draft" title="Draft" className={`${box} grid shrink-0 place-items-center rounded-md bg-background text-muted-foreground`}><FilePen aria-hidden="true" className={glyph} /></span>;
  }
  return <AgentToolIcon connection={row.providerConnection} toolId={row.providerKind} label={providerLabel ?? row.providerKind} className={`${box} shrink-0`} imageClassName={image} />;
}
