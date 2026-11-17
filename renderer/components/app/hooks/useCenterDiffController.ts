import { useCallback, useEffect, useMemo, useState } from "react";
import { openCenterFullDiff } from "@/components/app/logic/openCenterFullDiff";
import type { CenterDiffControllerInput, CenterDiffPorts, CenterDiffSource, ThreadBranchDiffTarget } from "@/components/app/types/centerDiff.types";

const WORKSPACE_DIFF: CenterDiffSource = { kind: "workspace" };

/** Owns which changes the center full-diff viewer shows; the sidebar opens the workspace, threads open their branch. */
export function useCenterDiffController({ fullDiffOpen, setTaskEditorState, setIsTaskBoardOpen, setIsCenterFullDiffExpanded,
  setIsCenterDiffExpanded, setActiveWorkspaceContentTab }: CenterDiffControllerInput): CenterDiffPorts {
  const [source, setSource] = useState<CenterDiffSource>(WORKSPACE_DIFF);
  useEffect(() => { if (!fullDiffOpen) setSource(WORKSPACE_DIFF); }, [fullDiffOpen]);
  const open = useCallback(() => openCenterFullDiff({ setTaskEditorState, setIsTaskBoardOpen, setIsCenterFullDiffExpanded,
    setIsCenterDiffExpanded, setActiveWorkspaceContentTab }),
  [setTaskEditorState, setIsTaskBoardOpen, setIsCenterFullDiffExpanded, setIsCenterDiffExpanded, setActiveWorkspaceContentTab]);
  const openWorkspaceDiff = useCallback(() => { setSource(WORKSPACE_DIFF); open(); }, [open]);
  const openBranchDiff = useCallback((target: ThreadBranchDiffTarget) => { setSource({ kind: "branch", target }); open(); }, [open]);
  return useMemo(() => ({ source, openWorkspaceDiff, openBranchDiff }), [source, openWorkspaceDiff, openBranchDiff]);
}
