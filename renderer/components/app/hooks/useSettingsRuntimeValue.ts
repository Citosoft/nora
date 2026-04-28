import { useOptionalSettingsRuntimeBuildDeps } from "@/components/app/context/appShellBuildContexts";
import { buildSettingsRuntimeValue } from "@/components/app/logic/buildSettingsRuntimeValue";
import type { SettingsRuntimeValue } from "@/components/app/types/settings.types";
import type { BuildSettingsRuntimeValueDeps } from "@/components/app/types/settingsRuntimeBuild.types";

/** Consumes full settings runtime build deps; narrows in `buildSettingsRuntimeValue`. */
export function useSettingsRuntimeValue(args?: BuildSettingsRuntimeValueDeps): SettingsRuntimeValue {
  const fromContext = useOptionalSettingsRuntimeBuildDeps();
  const resolved = args ?? fromContext;
  if (!resolved) {
    throw new Error("useSettingsRuntimeValue requires args or SettingsRuntimeBuildProvider.");
  }

  return buildSettingsRuntimeValue(resolved);
}
