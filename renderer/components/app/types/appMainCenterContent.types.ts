import type { NoteCenterProps, SpecCenterProps, TaskCenterProps, TaskPanelProps, WorkspaceSessionPanelProps } from "@/components/app/types/panel.types";
import type { ProjectSelectorScreenProps } from "@/components/app/types/workflow.types";

export type AppMainCenterContentValue = {
  taskPanelProps: TaskPanelProps | null;
  isTaskBoardOpen: boolean;
  taskCenterProps: TaskCenterProps;
  isSpecBrowserOpen: boolean;
  specCenterProps: SpecCenterProps;
  isNoteBrowserOpen: boolean;
  noteCenterProps: NoteCenterProps;
  shouldShowProjectSelectorScreen: boolean;
  projectSelectorScreenProps: ProjectSelectorScreenProps;
  workspaceSessionPanelProps: WorkspaceSessionPanelProps;
};
