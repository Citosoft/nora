import { SettingsRuntimeContext } from "@/components/app/panels/settings/SettingsRuntimeProvider";
import type { SettingsRuntimeValue } from "@/components/app/types/settings.types";
import { useContext } from "react";

export function useSettingsRuntime(): SettingsRuntimeValue {
  const context = useContext(SettingsRuntimeContext);
  if (!context) {
    throw new Error("useSettingsRuntime must be used within a SettingsRuntimeProvider.");
  }

  return context;
}
