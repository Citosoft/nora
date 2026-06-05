import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

type SectionMap = Record<string, boolean>;

function toggleSectionState(
  setState: Dispatch<SetStateAction<SectionMap>>,
  workspaceId: string
) {
  setState((current) => ({
    ...current,
    [workspaceId]: !(current[workspaceId] ?? true)
  }));
}

export function useWorkspaceSidebarSectionState() {
  const [collapsedWorkspaceWorktreeSectionIds, setCollapsedWorkspaceWorktreeSectionIds] = useState<SectionMap>({});
  const [collapsedWorkspaceAgentSectionIds, setCollapsedWorkspaceAgentSectionIds] = useState<SectionMap>({});
  const [collapsedWorkspaceTerminalSectionIds, setCollapsedWorkspaceTerminalSectionIds] = useState<SectionMap>({});
  const [collapsedWorkspaceTaskSectionIds, setCollapsedWorkspaceTaskSectionIds] = useState<SectionMap>({});
  const [collapsedWorkspaceSpecSectionIds, setCollapsedWorkspaceSpecSectionIds] = useState<SectionMap>({});
  const [collapsedWorkspaceNoteSectionIds, setCollapsedWorkspaceNoteSectionIds] = useState<SectionMap>({});
  const [collapsedWorkspaceAiChatSectionIds, setCollapsedWorkspaceAiChatSectionIds] = useState<SectionMap>({});

  return {
    collapsedWorkspaceWorktreeSectionIds,
    collapsedWorkspaceAgentSectionIds,
    collapsedWorkspaceTerminalSectionIds,
    collapsedWorkspaceAiChatSectionIds,
    collapsedWorkspaceNoteSectionIds,
    collapsedWorkspaceSpecSectionIds,
    collapsedWorkspaceTaskSectionIds,
    toggleWorkspaceWorktreeSection: (workspaceId: string) =>
      toggleSectionState(setCollapsedWorkspaceWorktreeSectionIds, workspaceId),
    toggleWorkspaceAgentSection: (workspaceId: string) =>
      toggleSectionState(setCollapsedWorkspaceAgentSectionIds, workspaceId),
    toggleWorkspaceTerminalSection: (workspaceId: string) =>
      toggleSectionState(setCollapsedWorkspaceTerminalSectionIds, workspaceId),
    toggleWorkspaceAiChatSection: (workspaceId: string) =>
      toggleSectionState(setCollapsedWorkspaceAiChatSectionIds, workspaceId),
    toggleWorkspaceNoteSection: (workspaceId: string) =>
      toggleSectionState(setCollapsedWorkspaceNoteSectionIds, workspaceId),
    toggleWorkspaceSpecSection: (workspaceId: string) =>
      toggleSectionState(setCollapsedWorkspaceSpecSectionIds, workspaceId),
    toggleWorkspaceTaskSection: (workspaceId: string) =>
      toggleSectionState(setCollapsedWorkspaceTaskSectionIds, workspaceId)
  };
}
