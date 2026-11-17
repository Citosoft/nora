import type { ForgeViewerBackInput } from "@/components/app/types/forgeViewerNavigation.types";

/** Back returns repository work items to their workspace list, keeping their viewer tabs available. */
export function backFromForgeViewer({ tab, openTool, closeViewer }: ForgeViewerBackInput): void {
  if (!tab) return;
  if (tab.kind === "pull_request" || tab.kind === "issue") {
    openTool(tab.projectId, tab.kind === "issue" ? "issues" : "merge-requests");
    return;
  }
  closeViewer(tab.id);
}
