import type { UseAppUiLayoutStateResult } from "@/components/app/types/appUiLayout.types";
import type { LocalTerminalState } from "@shared/appTypes";
import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from "react";

export type UseAppRootWorkspaceChromeArgs = {
  shouldApplyFirstLoadCollapsedPanels: boolean;
};

export type UseAppRootWorkspaceChromeResult = UseAppUiLayoutStateResult & {
  startSidebarResize: (side: "left" | "right", event: ReactPointerEvent<HTMLDivElement>) => void;
  isCreatingLocalTerminal: boolean;
  localTerminalState: LocalTerminalState | null;
  localTerminalDockFocusVersion: number;
  focusLocalTerminalDock: () => Promise<void>;
  setLocalTerminalState: Dispatch<SetStateAction<LocalTerminalState | null>>;
};
