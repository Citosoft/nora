import { assembleAppShellProviderSlices } from "@/components/app/logic/assembleAppShellProviderSlices";
import { assembleSettingsRuntimeBuildDeps } from "@/components/app/logic/assembleSettingsRuntimeBuildDeps";
import type { AppShellLayoutSlice } from "@/components/app/types/appShellLayoutSlice.types";
import type { AppShellProviderSlicesResult } from "@/components/app/types/appShellProviderSliceAssembly.types";
import type { AppShellSettingsRuntimeAssemblyInput } from "@/components/app/types/appShellSettingsRuntimeAssembly.types";
import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";

/** Assembly wiring for signed-in shell slices plus settings and layout — one surface for `buildSignedInAppShellProviderSlices`, no nested `shell` bag. */
export type BuildSignedInAppShellProviderSlicesInput = AppShellSignedInAssemblySources & {
  settings: AppShellSettingsRuntimeAssemblyInput;
  shellLayout: AppShellLayoutSlice;
};

export const buildSignedInAppShellProviderSlices = (
  input: BuildSignedInAppShellProviderSlicesInput
): AppShellProviderSlicesResult => {
  const { settings, shellLayout, ...shell } = input;
  return {
    ...assembleAppShellProviderSlices(shell),
    settingsRuntimeBuild: assembleSettingsRuntimeBuildDeps(settings),
    shellLayout
  };
};
