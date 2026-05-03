import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import {
  applyMacApplicationMenuCommand,
  type MacApplicationMenuActionHandlers
} from "@/components/app/logic/applyMacApplicationMenuCommand";
import type { MacApplicationMenuSyncPayload } from "@shared/types/macApplicationMenu.types";
import { useEffect, useRef } from "react";

type UseMacApplicationMenuBridgeArgs = {
  enabled: boolean;
  payload: MacApplicationMenuSyncPayload | null;
  handlers: MacApplicationMenuActionHandlers | null;
};

/**
 * Keeps the macOS system menu bar in sync with title-bar menu state and routes menu actions back into the app.
 */
export function useMacApplicationMenuBridge({ enabled, payload, handlers }: UseMacApplicationMenuBridgeArgs): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !payload) {
      return;
    }

    void noraSystemClient.syncMacApplicationMenu(payload).catch((error: unknown) => {
      console.error("[nora] syncMacApplicationMenu failed", error);
    });
  }, [enabled, payload]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return noraSystemClient.onMacApplicationMenuCommand((command) => {
      const currentHandlers = handlersRef.current;
      if (!currentHandlers) {
        return;
      }

      applyMacApplicationMenuCommand(command, currentHandlers);
    });
  }, [enabled]);
}
