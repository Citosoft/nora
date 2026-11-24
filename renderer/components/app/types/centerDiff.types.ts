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

/** One file to scroll to when the viewer opens; a fresh object per request so reopening the same file scrolls again. */
export interface DiffFileFocus { path: string; }

/** What the center full-diff viewer shows: the active workspace's working tree, or one thread's branch. */
export type CenterDiffSource =
  | { kind: "workspace"; focus: DiffFileFocus | null }
  | { kind: "branch"; target: ThreadBranchDiffTarget };

export interface CenterDiffPorts {
  source: CenterDiffSource;
  openWorkspaceDiff(): void;
  /** Opens the workspace diff scrolled to one file, for previews too large to show inline. */
  openWorkspaceFileDiff(path: string): void;
  openBranchDiff(target: ThreadBranchDiffTarget): void;
}

export type CenterFullDiffOpenDeps = Pick<ChangesPanelSectionBuildDeps,
  "setTaskEditorState" | "setIsTaskBoardOpen" | "setIsCenterFullDiffExpanded" | "setIsCenterDiffExpanded" | "setActiveWorkspaceContentTab">;

export interface CenterDiffControllerInput extends CenterFullDiffOpenDeps {
  /** Closing the viewer returns it to the workspace source, so later opens from shortcuts show workspace changes. */
  fullDiffOpen: boolean;
}

export interface FullDiffViewerProps {
  changes: ChangeEntry[];
  resolvedTheme: ResolvedTheme;
  focus?: DiffFileFocus | null;
}

export interface DiffFileCardProps {
  change: ChangeEntry;
  resolvedTheme: ResolvedTheme;
  /** The viewer's scroll container; cards render their lines only while near its visible area. */
  scrollRoot: HTMLElement | null;
}

export interface CenterFullDiffProps {
  snapshotChanges: ChangeEntry[];
  resolvedTheme: ResolvedTheme;
}

export interface ThreadBranchDiffViewProps {
  target: ThreadBranchDiffTarget;
  resolvedTheme: ResolvedTheme;
}
