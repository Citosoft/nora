import { useCallback, useEffect, useRef, useState } from "react";
import type { IslandBridge } from "@shared/types/island/island.types";

/** Grace period so a pointer brushing past the edge does not snap the island shut. */
const COLLAPSE_DELAY_MS = 280;

/**
 * Expands the island while the pointer is on it. The window takes clicks only while expanded, so clicks elsewhere
 * along the menu bar keep reaching the menu bar.
 */
export function useIslandExpansion(bridge: IslandBridge, available: boolean) {
  const [expanded, setExpanded] = useState(false);
  const collapseTimer = useRef<number | null>(null);

  const cancelCollapse = useCallback(() => {
    if (collapseTimer.current !== null) window.clearTimeout(collapseTimer.current);
    collapseTimer.current = null;
  }, []);

  const collapse = useCallback(() => {
    cancelCollapse();
    setExpanded(false);
    bridge.setInteractive(false);
  }, [bridge, cancelCollapse]);

  const onPointerEnter = useCallback(() => {
    cancelCollapse();
    setExpanded(true);
    bridge.setInteractive(true);
  }, [bridge, cancelCollapse]);

  const onPointerLeave = useCallback(() => {
    cancelCollapse();
    collapseTimer.current = window.setTimeout(collapse, COLLAPSE_DELAY_MS);
  }, [cancelCollapse, collapse]);

  // Work ending while expanded must also give clicks back to the menu bar.
  useEffect(() => { if (!available) collapse(); }, [available, collapse]);
  useEffect(() => cancelCollapse, [cancelCollapse]);

  return { expanded, onPointerEnter, onPointerLeave, collapse };
}
