import type { ReactNode } from "react";

/**
 * Elements the title bar lines itself up with: the main content column it aligns its divider and tabs to,
 * and the slot the workspace session tab row renders into.
 */
export type TitleBarLayoutValue = {
  tabSlot: HTMLElement | null;
  setTabSlot: (element: HTMLElement | null) => void;
  contentColumn: HTMLElement | null;
  setContentColumn: (element: HTMLElement | null) => void;
};

export type TitleBarLayoutProviderProps = {
  children: ReactNode;
};
