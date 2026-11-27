import { useEffect, useState } from "react";
import type { IslandBridge, IslandView } from "@shared/types/island/island.types";

/** The island's latest view from main; null until the first one arrives. */
export function useIslandView(bridge: IslandBridge): IslandView | null {
  const [view, setView] = useState<IslandView | null>(null);
  useEffect(() => bridge.onView(setView), [bridge]);
  return view;
}
