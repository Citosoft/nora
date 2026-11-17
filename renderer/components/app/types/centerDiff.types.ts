import type { ChangeEntry } from "@shared/appTypes";
import type { ResolvedTheme } from "@/components/app/types";
import type { ChangesPanelSectionBuildDeps } from "./changesPanelSectionBuild.types";

/** A thread checkout's branch, compared from its merge base with the default branch. */
export interface ThreadBranchDiffTarget {
  projectId: string;
  checkoutPath: string;
  branch: string;
  baseBranch: string | null;
}

/** What the center full-diff viewer shows: the active workspace's working tree, or one thread's branch. */
export type CenterDiffSource =
  | { kind: "workspace" }
  | { kind: "branch"; target: ThreadBranchDiffTarget };

export interface CenterDiffPorts {
  source: CenterDiffSource;
  openWorkspaceDiff(): void;
  openBranchDiff(target: ThreadBranchDiffTarget): void;
}

export type CenterFullDiffOpenDeps = Pick<ChangesPanelSectionBuildDeps,
  "setTaskEditorState" | "setIsTaskBoardOpen" | "setIsCenterFullDiffExpanded" | "setIsCenterDiffExpanded" | "setActiveWorkspaceContentTab">;

export interface CenterDiffControllerInput extends CenterFullDiffOpenDeps {
  /** Closing the viewer returns it to the workspace source, so later opens from shortcuts show workspace changes. */
  fullDiffOpen: boolean;
}

export interface CenterFullDiffProps {
  snapshotChanges: ChangeEntry[];
  resolvedTheme: ResolvedTheme;
}

export interface ThreadBranchDiffViewProps {
  target: ThreadBranchDiffTarget;
  resolvedTheme: ResolvedTheme;
}
