import type { UiState } from "@/components/app/types";
import type { AppState } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo } from "react";

export type WorkspaceSessionFocusCommands = {
  focusAgentSessionTab: (agentId: string) => void;
  focusTerminalSessionTab: (sessionId: string) => void;
  focusBrowserSessionTab: (tabId: string) => void;
  focusAiChatSessionTab: (tabId: string) => void;
  focusForgeViewerSessionTab: (tabId: string) => void;
};

type UseWorkspaceSessionFocusCommandsArgs = {
  setUiState: Dispatch<SetStateAction<UiState>>;
  normalizeSnapshot: (next: AppState) => AppState;
};

export function useWorkspaceSessionFocusCommands({
  setUiState,
  normalizeSnapshot
}: UseWorkspaceSessionFocusCommandsArgs): WorkspaceSessionFocusCommands {
  const applyFocusedSessionSnapshot = useCallback((next: AppState) => {
    setUiState((current) => ({
      ...current,
      snapshot: normalizeSnapshot(next),
      focusedBrowserTabId: null,
      focusedAiChatTabId: null,
      focusedForgeViewerTabId: null
    }));
  }, [normalizeSnapshot, setUiState]);

  const focusAgentSessionTab = useCallback((agentId: string) => {
    const typedWindow = window as unknown as Window & {
      nora: {
        focusAgent: (id: string) => Promise<AppState>;
      };
    };
    void typedWindow.nora.focusAgent(agentId).then((next: AppState) => {
      applyFocusedSessionSnapshot(next);
    });
  }, [applyFocusedSessionSnapshot]);

  const focusTerminalSessionTab = useCallback((sessionId: string) => {
    const typedWindow = window as unknown as Window & {
      nora: {
        focusTerminal: (id: string) => Promise<AppState>;
      };
    };
    void typedWindow.nora.focusTerminal(sessionId).then((next: AppState) => {
      applyFocusedSessionSnapshot(next);
    });
  }, [applyFocusedSessionSnapshot]);

  const focusBrowserSessionTab = useCallback((tabId: string) => {
    setUiState((current) => ({
      ...current,
      focusedBrowserTabId: tabId,
      focusedAiChatTabId: null,
      focusedForgeViewerTabId: null
    }));
  }, [setUiState]);

  const focusAiChatSessionTab = useCallback((tabId: string) => {
    setUiState((current) => ({
      ...current,
      focusedBrowserTabId: null,
      focusedAiChatTabId: tabId,
      focusedForgeViewerTabId: null
    }));
  }, [setUiState]);

  const focusForgeViewerSessionTab = useCallback((tabId: string) => {
    setUiState((current) => ({
      ...current,
      focusedBrowserTabId: null,
      focusedAiChatTabId: null,
      focusedForgeViewerTabId: tabId
    }));
  }, [setUiState]);

  return useMemo(() => ({
    focusAgentSessionTab,
    focusTerminalSessionTab,
    focusBrowserSessionTab,
    focusAiChatSessionTab,
    focusForgeViewerSessionTab
  }), [
    focusAgentSessionTab,
    focusTerminalSessionTab,
    focusBrowserSessionTab,
    focusAiChatSessionTab,
    focusForgeViewerSessionTab
  ]);
}
