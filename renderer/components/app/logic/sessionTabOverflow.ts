import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";

export const SESSION_TAB_WIDTH = 180;
export const SESSION_TAB_MORE_WIDTH = 96;
const NEW_TAB_WIDTH = 32;
const STRIP_PADDING = 24;
const TAB_GAP = 4;

export function partitionSessionTabs(tabs: WorkspaceSessionTab[], activeTabId: string | null, width: number) {
  const availableWidth = Math.max(0, width - STRIP_PADDING - NEW_TAB_WIDTH);
  const capacity = Math.max(0, Math.floor(
    (availableWidth - (tabs.length * (SESSION_TAB_WIDTH + TAB_GAP) > availableWidth ? SESSION_TAB_MORE_WIDTH + TAB_GAP : 0)) / (SESSION_TAB_WIDTH + TAB_GAP)
  ));
  const visibleTabs = tabs.slice(0, capacity);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  // Keep the selected tab reachable in the strip without reordering the saved tabs.
  if (capacity > 0 && activeTab && !visibleTabs.includes(activeTab)) {
    visibleTabs[visibleTabs.length - 1] = activeTab;
  }
  const visibleIds = new Set(visibleTabs.map((tab) => tab.id));
  return { visibleTabs, overflowTabs: tabs.filter((tab) => !visibleIds.has(tab.id)) };
}
