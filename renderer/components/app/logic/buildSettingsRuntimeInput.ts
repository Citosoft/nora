import type { AppShellSettingsRuntimeAssemblyInput } from "@/components/app/types/appShellSettingsRuntimeAssembly.types";

export function buildSettingsRuntimeInput({
  nav,
  appearance,
  integrations,
  appPrefs,
  runtime,
  sidebarLayout,
  toasts
}: AppShellSettingsRuntimeAssemblyInput): AppShellSettingsRuntimeAssemblyInput {
  return {
    nav: buildSettingsNavInput(nav),
    appearance: buildSettingsAppearanceInput(appearance),
    integrations: buildSettingsIntegrationsInput(integrations),
    appPrefs: buildSettingsAppPrefsInput(appPrefs),
    runtime: buildSettingsRuntimeSectionInput(runtime),
    sidebarLayout: buildSettingsSidebarLayoutInput(sidebarLayout),
    toasts: buildSettingsToastsInput(toasts)
  };
}

function buildSettingsNavInput(
  nav: AppShellSettingsRuntimeAssemblyInput["nav"]
): AppShellSettingsRuntimeAssemblyInput["nav"] {
  return nav;
}

function buildSettingsAppearanceInput(
  appearance: AppShellSettingsRuntimeAssemblyInput["appearance"]
): AppShellSettingsRuntimeAssemblyInput["appearance"] {
  return appearance;
}

function buildSettingsIntegrationsInput(
  integrations: AppShellSettingsRuntimeAssemblyInput["integrations"]
): AppShellSettingsRuntimeAssemblyInput["integrations"] {
  return integrations;
}

function buildSettingsAppPrefsInput(
  appPrefs: AppShellSettingsRuntimeAssemblyInput["appPrefs"]
): AppShellSettingsRuntimeAssemblyInput["appPrefs"] {
  return appPrefs;
}

function buildSettingsRuntimeSectionInput(
  runtime: AppShellSettingsRuntimeAssemblyInput["runtime"]
): AppShellSettingsRuntimeAssemblyInput["runtime"] {
  return runtime;
}

function buildSettingsSidebarLayoutInput(
  sidebarLayout: AppShellSettingsRuntimeAssemblyInput["sidebarLayout"]
): AppShellSettingsRuntimeAssemblyInput["sidebarLayout"] {
  return sidebarLayout;
}

function buildSettingsToastsInput(
  toasts: AppShellSettingsRuntimeAssemblyInput["toasts"]
): AppShellSettingsRuntimeAssemblyInput["toasts"] {
  return toasts;
}
