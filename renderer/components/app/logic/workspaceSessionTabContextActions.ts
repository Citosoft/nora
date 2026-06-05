import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";

function isSameSessionTab(left: WorkspaceSessionTab, right: WorkspaceSessionTab): boolean {
  return left.kind === right.kind && left.id === right.id;
}

export function isDirectionalClosableWorkspaceSessionTab(tab: WorkspaceSessionTab): boolean {
  return tab.kind !== "agent";
}

export function getWorkspaceSessionTabsToClose(
  tabs: WorkspaceSessionTab[],
  anchorTab: WorkspaceSessionTab,
  action: "close" | "close-others" | "close-right" | "close-left"
): WorkspaceSessionTab[] {
  const anchorIndex = tabs.findIndex((tab) => isSameSessionTab(tab, anchorTab));
  if (anchorIndex < 0) {
    return [];
  }

  if (action === "close") {
    return [tabs[anchorIndex]];
  }
  if (action === "close-others") {
    return tabs.filter((_, index) => index !== anchorIndex);
  }
  if (action === "close-right") {
    return tabs.slice(anchorIndex + 1).filter(isDirectionalClosableWorkspaceSessionTab);
  }
  return tabs.slice(0, anchorIndex).filter(isDirectionalClosableWorkspaceSessionTab);
}
