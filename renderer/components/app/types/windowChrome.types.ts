import type { NativeRuntimePorts } from "@/components/app/types/thread-workspace/runtime.types";
import type { RolePresentation } from "@/components/app/types/personalization.types";
import type { RoleId, RoleSelection } from "@shared/types/personalization/roles.types";
import type { ReactNode } from "react";

export interface TitleBarControlsProps {
  useMacTitleBarChrome: boolean;
  isMaximized: boolean;
  iconToneClass: string;
}

export interface TitleBarRoleSwitcherProps {
  /** Shows only the icon when the title bar is short on room. */
  compact: boolean;
  iconToneClass: string;
}

export interface TitleBarRoleMenuProps extends TitleBarRoleSwitcherProps {
  native: NativeRuntimePorts;
  focusedWorkspaceId: string | null;
}

/** One tile in the role switcher: a preset role, or the saved custom role. */
export interface RoleSwitcherChoice {
  selection: RoleSelection;
  label: string;
  presentation: RolePresentation;
}

export interface RoleSwitcherPanelProps {
  choices: readonly RoleSwitcherChoice[];
  current: RoleSelection | null;
  /** Shown under the grid: a save failure or a workspace that keeps its own role. */
  note: { text: string; tone: "info" | "error" } | null;
  onChoose(selection: RoleSelection): void;
}

export interface RoleSidebarPreviewProps {
  role: RoleId | null;
}

export interface SetupWindowShellProps {
  children: ReactNode;
  /** Decorative layer filling the whole window, title bar included, behind the content. */
  backdrop?: ReactNode;
}
