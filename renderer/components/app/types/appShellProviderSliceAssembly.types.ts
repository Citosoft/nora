import type { AppChromeShellComposeSlice } from "@/components/app/types/appChromeShellComposeSlice.types";
import type { AppModalDialogsBuildDeps } from "@/components/app/types/appModalDialogsBuild.types";
import type { AppShellLayoutSlice } from "@/components/app/types/appShellLayoutSlice.types";
import type { BuildSettingsRuntimeValueDeps } from "@/components/app/types/settingsRuntimeBuild.types";

/**
 * Grouped inputs for the signed-in shell: modal + settings + chrome compose + layout.
 * Center, workspace sidebar, and changes-section builds are exposed via region ports from `signedInAssemblySources`.
 */
export type AppShellProviderSliceAssembly = {
  modalDialogs: AppModalDialogsBuildDeps;
  settingsRuntime: BuildSettingsRuntimeValueDeps;
  chromeShellCompose: AppChromeShellComposeSlice;
  shellLayout: AppShellLayoutSlice;
};

export type AppShellProviderSlicesResult = {
  modalDialogsBuild: AppModalDialogsBuildDeps;
  settingsRuntimeBuild: BuildSettingsRuntimeValueDeps;
  chromeShellCompose: AppChromeShellComposeSlice;
  shellLayout: AppShellLayoutSlice;
};
