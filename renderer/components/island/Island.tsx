import { useCallback } from "react";
import type { CSSProperties } from "react";
import { useIslandExpansion } from "@/components/app/hooks/useIslandExpansion";
import { useIslandView } from "@/components/app/hooks/useIslandView";
import { islandOverflow, islandSummary } from "@/components/app/logic/island/islandSummary";
import type { IslandProps } from "@/components/app/types/island.types";
import { ISLAND_SIZE_SCALE } from "@shared/island/settings";
import type { IslandItem } from "@shared/types/island/island.types";
import { IslandBar } from "./IslandBar";
import { IslandShoulder } from "./IslandShoulder";
import { IslandWorkRow } from "./IslandWorkRow";

/** Each side of the camera at the notch's own size: room for the lead's icon and name, and the inbox button. */
const WING_WIDTH = 148;
const SHOULDER_RADIUS = 10;
/**
 * How far the island reaches below the measured notch. The menu bar height Electron reports stops a point or two
 * short of the camera housing's bottom edge, which would otherwise peek out beneath the island.
 */
const NOTCH_OVERLAP = 3;
const EXPANDED_MIN_WIDTH = 440;

/**
 * A black shape around the MacBook notch while threads are active, or always when the user keeps it showing.
 * Collapsed it is one row, level with the notch, naming who leads the work and offering the inbox; on hover it
 * drops down the list of active work. Main sends a view only while the island should show.
 */
export function Island({ bridge }: IslandProps) {
  const view = useIslandView(bridge);
  const { expanded, onPointerEnter, onPointerLeave, collapse } = useIslandExpansion(bridge, view !== null);
  const open = useCallback((item: IslandItem) => { collapse(); bridge.open(item.target); }, [bridge, collapse]);
  const openInbox = useCallback(() => { collapse(); bridge.openInbox(); }, [bridge, collapse]);
  const openNora = useCallback(() => { collapse(); bridge.openNora(); }, [bridge, collapse]);
  if (!view) return null;

  const { geometry, state } = view;
  const scale = ISLAND_SIZE_SCALE[view.size];
  const lead = state.items[0] ?? null;
  const overflow = islandOverflow(state.counts, state.items.length);
  const summary = islandSummary(state.counts) || "Nothing running";
  const collapsedWidth = geometry.notchWidth + Math.round(WING_WIDTH * scale) * 2;
  const shapeStyle: CSSProperties = { width: expanded ? Math.max(EXPANDED_MIN_WIDTH, collapsedWidth) : collapsedWidth };

  return <div style={shapeStyle} className="absolute left-1/2 top-0 -translate-x-1/2 motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out">
    <IslandShoulder side="left" radius={SHOULDER_RADIUS * scale} />
    <IslandShoulder side="right" radius={SHOULDER_RADIUS * scale} />
    <section aria-label={`Nora: ${summary}`} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}
      className={`relative w-full overflow-hidden bg-black text-white motion-safe:transition-[border-radius,box-shadow] motion-safe:duration-300 motion-safe:ease-out ${expanded ? "rounded-b-[26px] shadow-[0_8px_24px_rgba(0,0,0,0.35)]" : "rounded-b-[14px]"}`}>
      <IslandBar lead={lead} scale={scale} counts={state.counts} height={Math.round((geometry.notchHeight + NOTCH_OVERLAP) * scale)} notchWidth={geometry.notchWidth}
        onOpenInbox={openInbox} />
      <div className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden" inert={!expanded}>
          <div className="space-y-1 px-2 pb-2.5 pt-1.5">
            {state.items.length > 0 ? <ul className="space-y-0.5">
              {state.items.map((item) => <IslandWorkRow key={item.key} item={item} onOpen={open} />)}
            </ul> : null}
            <div className="flex items-center justify-between gap-2 px-2.5 pt-1 text-xs">
              <span className="min-w-0 truncate text-white/50">
                {summary}{overflow > 0 ? ` · +${overflow} more` : ""}
              </span>
              <button type="button" onClick={openNora}
                className="shrink-0 rounded-md px-2 py-1 font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:outline-none">
                Open Nora
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>;
}
