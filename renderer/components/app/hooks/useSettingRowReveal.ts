import { findSettingAnchor } from "@/components/app/logic/settingsSearch";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type { SettingRowRevealTarget } from "@/components/app/types/settingsSearch.types";
import { useEffect, type RefObject } from "react";

const REVEAL_HIGHLIGHT_MS = 1600;

/** Scrolls a search-selected setting into view once its group is showing, and briefly highlights it. */
export function useSettingRowReveal(
  containerRef: RefObject<HTMLElement | null>,
  activeGroup: SettingsGroup,
  target: SettingRowRevealTarget | null
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !target || target.group !== activeGroup) {
      return;
    }
    const anchor = findSettingAnchor(container, target.title);
    if (!anchor) {
      container.scrollTop = 0;
      return;
    }
    anchor.scrollIntoView({ block: "center", behavior: "smooth" });
    anchor.dataset.searchRevealed = "true";
    const timeout = window.setTimeout(() => {
      delete anchor.dataset.searchRevealed;
    }, REVEAL_HIGHLIGHT_MS);
    return () => {
      window.clearTimeout(timeout);
      delete anchor.dataset.searchRevealed;
    };
  }, [containerRef, activeGroup, target]);
}
