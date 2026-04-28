import type { UseAppRootFocusedSessionMainSurfaceResetEffectArgs } from "@/components/app/types/useAppRootFocusedSessionMainSurfaceResetEffect.types";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useEffect } from "react";

export const useAppRootFocusedSessionMainSurfaceResetEffect = ({
  lastFocusedSessionRef,
  resetWorkspaceMainSurface
}: UseAppRootFocusedSessionMainSurfaceResetEffectArgs): void => {
  const snapshot = useCanonicalAppSnapshot();
  useEffect(() => {
    const previous = lastFocusedSessionRef.current;
    const nextAgentId = snapshot?.focusedAgentId ?? null;
    const nextTerminalId = snapshot?.focusedTerminalId ?? null;
    const focusedSessionChanged = previous.agentId !== nextAgentId || previous.terminalId !== nextTerminalId;

    lastFocusedSessionRef.current = {
      agentId: nextAgentId,
      terminalId: nextTerminalId
    };

    if (!focusedSessionChanged || (!nextAgentId && !nextTerminalId)) {
      return;
    }

    resetWorkspaceMainSurface({
      setMainView: false,
      clearFocusedAiChatTab: false
    });
  }, [lastFocusedSessionRef, resetWorkspaceMainSurface, snapshot?.focusedAgentId, snapshot?.focusedTerminalId]);
};
