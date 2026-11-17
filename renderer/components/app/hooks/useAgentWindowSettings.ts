import { useEffect, useRef } from "react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { applyWindowSettings, readWindowSettings } from "@/components/app/logic/windowSettings";
import type { WindowSettingsSetters } from "@/components/app/types/agentSettings.types";

export function useAgentWindowSettings(setters: WindowSettingsSetters): void {
  const latest = useRef(setters);
  latest.current = setters;
  useEffect(() => noraSystemClient.onWindowSettingsRequest(({ id, patch }) => {
    try {
      applyWindowSettings(patch, latest.current);
      void noraSystemClient.replyWindowSettings({ id, status: "success", settings: readWindowSettings() }).catch(() => undefined);
    } catch (error) {
      void noraSystemClient.replyWindowSettings({ id, status: "error", message: error instanceof Error ? error.message : "Could not update window settings." }).catch(() => undefined);
    }
  }), []);
}
