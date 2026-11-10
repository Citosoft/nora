import type { ReactNode } from "react";

export interface TitleBarControlsProps {
  useMacTitleBarChrome: boolean;
  isMaximized: boolean;
  iconToneClass: string;
}

export interface SetupWindowShellProps {
  children: ReactNode;
}
