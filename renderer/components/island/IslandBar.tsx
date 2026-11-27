import { Inbox } from "lucide-react";
import { NoraGlyph } from "@/components/app/shared/NoraGlyph";
import { islandIdentityName } from "@/components/app/logic/island/islandSummary";
import type { IslandBarProps } from "@/components/app/types/island.types";
import { APP_SHORT_NAME } from "@shared/appMeta";
import { IslandIdentityIcon } from "./IslandIdentityIcon";
import { IslandPhaseIndicator } from "./IslandPhaseIndicator";

/** Sizes at the notch's own scale; the user's island size grows them together. */
const ICON_SIZE = 18;
const TEXT_SIZE = 12;
const INBOX_BUTTON_SIZE = 28;
const INBOX_ICON_SIZE = 16;
const PHASE_SIZE = 13;

/**
 * The island's only row while collapsed, level with the notch: who leads the work (or Nora, when nothing is
 * running) on the left of the camera and the inbox on its right. Nothing is drawn in the middle, where the camera
 * housing hides it.
 */
export function IslandBar({ lead, scale, counts, height, notchWidth, onOpenInbox }: IslandBarProps) {
  const name = lead ? islandIdentityName(lead.identity) : APP_SHORT_NAME;
  const iconSize = Math.round(ICON_SIZE * scale);
  const buttonSize = Math.round(INBOX_BUTTON_SIZE * scale);
  const inboxIconSize = Math.round(INBOX_ICON_SIZE * scale);
  return <div className="flex items-center" style={{ height }}>
    <div className="flex min-w-0 flex-1 items-center gap-1.5 pl-3 pr-1.5" title={lead ? `${name}: ${lead.title}` : "Nothing running"}>
      {lead
        ? <IslandIdentityIcon identity={lead.identity} phase={lead.phase} size={iconSize} />
        : <span className="grid shrink-0 place-items-center text-white/70" style={{ width: iconSize, height: iconSize }}>
          <NoraGlyph className="size-full text-white/70" />
        </span>}
      <span className={`truncate font-medium ${lead ? "text-white/90" : "text-white/55"}`} style={{ fontSize: TEXT_SIZE * scale }}>{name}</span>
      {lead ? <IslandPhaseIndicator phase={lead.phase} size={Math.round(PHASE_SIZE * scale)} /> : null}
    </div>
    <div aria-hidden className="shrink-0" style={{ width: notchWidth }} />
    <div className="flex flex-1 items-center justify-end pl-2 pr-2.5">
      <button type="button" onClick={onOpenInbox} style={{ width: buttonSize, height: buttonSize }}
        aria-label={counts.waiting > 0 ? `Open inbox, ${counts.waiting} waiting on you` : "Open inbox"}
        className="relative grid place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:outline-none">
        <Inbox aria-hidden style={{ width: inboxIconSize, height: inboxIconSize }} />
        {counts.waiting > 0 ? <span aria-hidden
          className="absolute -right-0.5 -top-0.5 grid min-w-3.5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-semibold leading-[14px] text-black">
          {counts.waiting}
        </span> : null}
      </button>
    </div>
  </div>;
}
