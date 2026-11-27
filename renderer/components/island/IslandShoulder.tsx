import type { CSSProperties } from "react";
import type { IslandShoulderProps } from "@/components/app/types/island.types";

/**
 * The inward curve at one top corner of the island, joining it to the top edge of the screen as the notch housing does: black in the corner against the screen edge, with a
 * quarter-circle cut away so the island's side sweeps out into the top of the screen instead of dropping straight.
 */
export function IslandShoulder({ side, radius }: IslandShoulderProps) {
  const style: CSSProperties = {
    width: radius,
    height: radius,
    [side]: -radius,
    background: `radial-gradient(circle at ${side === "left" ? "0" : "100%"} 100%, transparent ${radius - 0.5}px, #000 ${radius}px)`
  };
  return <span aria-hidden className="pointer-events-none absolute top-0" style={style} />;
}
