import type { AppChromeShellComposeSlice } from "@/components/app/types/appChromeShellComposeSlice.types";
import type { AppShellLayoutSlice } from "@/components/app/types/appShellLayoutSlice.types";
import type { BuildSettingsRuntimeValueDeps } from "@/components/app/types/settingsRuntimeBuild.types";
import { createContext, useContext, type Context, type ReactElement, type ReactNode } from "react";

/**
 * Remaining build-context providers for slices not yet folded into region ports (settings runtime, chrome compose slice, shell layout).
 * Modal, center column, workspace sidebar, and changes-section builds are read via **`use*Ports()`** from signed-in composition.
 */
const SettingsRuntimeBuildContext = createContext<BuildSettingsRuntimeValueDeps | null>(null);
const AppChromeShellComposeContext = createContext<AppChromeShellComposeSlice | null>(null);
const AppShellLayoutContext = createContext<AppShellLayoutSlice | null>(null);

function createBuildProvider<T>(Ctx: Context<T | null>, label: string) {
  const Provider = ({ value, children }: { value: T; children: ReactNode }): ReactElement => (
    <Ctx.Provider value={value}>{children}</Ctx.Provider>
  );
  const useValue = (): T => {
    const v = useContext(Ctx);
    if (!v) {
      throw new Error(`${label} must be used within its matching provider.`);
    }
    return v;
  };
  return { Provider, useValue };
}

const settingsRuntime = createBuildProvider(SettingsRuntimeBuildContext, "useSettingsRuntimeBuildDeps");
const chromeShellCompose = createBuildProvider(AppChromeShellComposeContext, "useAppChromeShellComposeSlice");
const shellLayout = createBuildProvider(AppShellLayoutContext, "useAppShellLayoutSlice");

export const SettingsRuntimeBuildProvider = settingsRuntime.Provider;
export const useSettingsRuntimeBuildDeps = settingsRuntime.useValue;

export const AppChromeShellComposeProvider = chromeShellCompose.Provider;
export const useAppChromeShellComposeSlice = chromeShellCompose.useValue;

export const AppShellLayoutProvider = shellLayout.Provider;
export const useAppShellLayoutSlice = shellLayout.useValue;

export function useOptionalSettingsRuntimeBuildDeps(): BuildSettingsRuntimeValueDeps | null {
  return useContext(SettingsRuntimeBuildContext);
}
