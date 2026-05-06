import type { WorkspaceSessionSurfaceSignedInSliceInput } from "@/components/app/features/workspace-session/types/workspaceSessionSignedInAssemblySlice.types";
import type { AppShellSignedInSessionSurfaceSources } from "@/components/app/types/appShellSignedInAssemblySources.types";

export const buildWorkspaceSessionSurfaceSignedInSlice = (
  input: WorkspaceSessionSurfaceSignedInSliceInput
): AppShellSignedInSessionSurfaceSources => {
  const v = input.workspaceSessionViews;
  return {
    activeGridColumns: v.activeGridColumns,
    activeGridRows: v.activeGridRows,
    activeView: v.activeView,
    activeSplitViewCollection: input.activeSplitViewCollection,
    activeWorkspaceContentTab: input.activeWorkspaceContentTab,
    fileEditorState: input.fileEditorState,
    focusedAgent: input.focusedAgent,
    focusedAiChatTab: input.focusedAiChatTab,
    focusedBrowserTab: input.focusedBrowserTab,
    focusedForgeViewerTab: input.focusedForgeViewerTab,
    focusedTerminal: input.focusedTerminal,
    focusedWorkspace: input.focusedWorkspace,
    selectedChange: input.selectedChange,
    isCenterDiffExpanded: input.isCenterDiffExpanded,
    isCenterFullDiffExpanded: input.isCenterFullDiffExpanded,
    setActiveWorkspaceContentTab: input.setActiveWorkspaceContentTab,
    setFileEditorState: input.setFileEditorState,
    setIsCenterDiffExpanded: input.setIsCenterDiffExpanded,
    setIsCenterFullDiffExpanded: input.setIsCenterFullDiffExpanded,
    splitViewsErrorMessage: input.splitViewsErrorMessage,
    splitViewsLoading: input.splitViewsLoading,
    shouldShowProjectSelectorScreen: input.shouldShowProjectSelectorScreen,
    terminalFontId: input.terminalFontId,
    terminalThemeId: input.terminalThemeId,
    workspaceSessionViews: input.workspaceSessionViews
  };
};
