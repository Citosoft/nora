import type { AppMainCenterContentValue } from "@/components/app/types/appMainCenterContent.types";
import type { ChangesPanelSectionProps } from "@/components/app/types/changesPanel.types";
import type { WorkspaceSidebarProps } from "@/components/app/types/component.types";
import type { LocalTerminalDockProps } from "@/components/app/types/panel.types";
import type { WorkspaceRuntimeValue } from "@/components/app/types/workspaceRuntime.types";
import type { WorkspaceSessionLoadingOverlayProps } from "@/components/app/types/workspaceSessionLoadingOverlay.types";
import type { PointerEvent } from "react";

export type AppSignedInWorkspaceViewProps = {
  workspaceRuntimeValue: WorkspaceRuntimeValue;
  gridTemplateColumns: string;
  areSidebarsSwapped: boolean;
  workspaceSidebarContextValue: WorkspaceSidebarProps;
  isWorkspaceSidebarCollapsed: boolean;
  onStartWorkspaceSidebarResize: (event: PointerEvent<HTMLDivElement>) => void;
  appMainCenterContentValue: AppMainCenterContentValue;
  localTerminalDockProps: LocalTerminalDockProps;
  workspaceSessionLoadingOverlayProps: WorkspaceSessionLoadingOverlayProps;
  hasActiveWorkspace: boolean;
  changesPanelSectionProps: ChangesPanelSectionProps;
  isChangesSidebarCollapsed: boolean;
  onStartChangesSidebarResize: (event: PointerEvent<HTMLDivElement>) => void;
};
