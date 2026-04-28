import type { ResetWorkspaceMainSurfaceOptions } from "@/components/app/types/appMainViewReset.types";
import type { MutableRefObject } from "react";

export type UseAppRootFocusedSessionMainSurfaceResetEffectArgs = {
  lastFocusedSessionRef: MutableRefObject<{ agentId: string | null; terminalId: string | null }>;
  resetWorkspaceMainSurface: (options?: ResetWorkspaceMainSurfaceOptions) => void;
};
