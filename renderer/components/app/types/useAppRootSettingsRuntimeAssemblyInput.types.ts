import type { AppShellSettingsRuntimeAssemblyInput } from "@/components/app/types/appShellSettingsRuntimeAssembly.types";
import type { BuildSettingsRuntimeValueDeps } from "@/components/app/types/settingsRuntimeBuild.types";

export type UseAppRootSettingsRuntimeAssemblyInputArgs = Omit<BuildSettingsRuntimeValueDeps, "snapshot">;

export type UseAppRootSettingsRuntimeAssemblyInputResult = AppShellSettingsRuntimeAssemblyInput | null;
