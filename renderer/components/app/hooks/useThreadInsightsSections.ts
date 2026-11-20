import { useMemo, useSyncExternalStore } from "react";
import { readHiddenSections, subscribeHiddenSections, toggleHiddenSection, writeHiddenSections } from "@/components/app/logic/threadInsightsSectionsStore";
import type { ThreadInsightsSectionVisibility } from "@/components/app/types/threadInsights.types";

/** Which thread details sections the user has hidden; shared by every thread and kept across launches. */
export function useThreadInsightsSections(): ThreadInsightsSectionVisibility {
  const hidden = useSyncExternalStore(subscribeHiddenSections, readHiddenSections, readHiddenSections);
  return useMemo(() => ({
    hidden,
    isVisible: (id) => !hidden.has(id),
    toggle: (id) => writeHiddenSections(toggleHiddenSection(readHiddenSections(), id)),
    showAll: () => writeHiddenSections(new Set())
  }), [hidden]);
}
