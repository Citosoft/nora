import type { CenterFullDiffOpenDeps } from "@/components/app/types/centerDiff.types";

/** Shows the center full-diff viewer in place of the task board or editor. */
export function openCenterFullDiff(d: CenterFullDiffOpenDeps): void {
  d.setTaskEditorState(null);
  d.setIsTaskBoardOpen(false);
  d.setIsCenterFullDiffExpanded(true);
  d.setIsCenterDiffExpanded(true);
  d.setActiveWorkspaceContentTab("diff");
}
