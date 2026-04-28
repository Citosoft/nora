import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import type { LocalTerminalState } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";

export function useLocalTerminalDock({
  isLocalTerminalDockCollapsed,
  setIsLocalTerminalDockCollapsed
}: {
  isLocalTerminalDockCollapsed: boolean;
  setIsLocalTerminalDockCollapsed: Dispatch<SetStateAction<boolean>>;
}): {
  isCreatingLocalTerminal: boolean;
  localTerminalState: LocalTerminalState | null;
  localTerminalDockFocusVersion: number;
  focusLocalTerminalDock: () => Promise<void>;
  setLocalTerminalState: Dispatch<SetStateAction<LocalTerminalState | null>>;
} {
  const [isCreatingLocalTerminal, setIsCreatingLocalTerminal] = useState(false);
  const [localTerminalState, setLocalTerminalState] = useState<LocalTerminalState | null>(null);
  const [localTerminalDockFocusVersion, setLocalTerminalDockFocusVersion] = useState(0);

  const openLocalTerminalDock = useCallback(async (): Promise<void> => {
    if (isCreatingLocalTerminal || localTerminalState) {
      return;
    }

    setIsCreatingLocalTerminal(true);
    try {
      const next = await noraTerminalClient.openLocalTerminal();
      setLocalTerminalState(next);
    } finally {
      setIsCreatingLocalTerminal(false);
    }
  }, [isCreatingLocalTerminal, localTerminalState]);

  const focusLocalTerminalDock = useCallback(async (): Promise<void> => {
    if (isLocalTerminalDockCollapsed) {
      setIsLocalTerminalDockCollapsed(false);
    }

    if (!localTerminalState && !isCreatingLocalTerminal) {
      await openLocalTerminalDock();
    }

    setLocalTerminalDockFocusVersion((current) => current + 1);
  }, [
    isCreatingLocalTerminal,
    isLocalTerminalDockCollapsed,
    localTerminalState,
    openLocalTerminalDock,
    setIsLocalTerminalDockCollapsed
  ]);

  useEffect(() => {
    if (localTerminalState || isCreatingLocalTerminal) {
      return;
    }

    void openLocalTerminalDock();
  }, [isCreatingLocalTerminal, localTerminalState, openLocalTerminalDock]);

  return {
    isCreatingLocalTerminal,
    localTerminalState,
    localTerminalDockFocusVersion,
    focusLocalTerminalDock,
    setLocalTerminalState
  };
}
