import type {
  AppRootSignedInProviderSlicesWiringInput,
  AppRootSignedInShellAssemblyWiring
} from "@/components/app/types/appRootSignedInProviderSlicesWiring.types";
import type { AppShellLayoutSlice } from "@/components/app/types/appShellLayoutSlice.types";
import type { AppShellSettingsRuntimeAssemblyInput } from "@/components/app/types/appShellSettingsRuntimeAssembly.types";

export type BuildAppRootSignedInProviderSlicesWiringInputArgs = Readonly<{
  settingsAssemblyInput: AppShellSettingsRuntimeAssemblyInput;
  shell: AppRootSignedInShellAssemblyWiring;
  shellLayout: AppShellLayoutSlice;
}>;

export const buildAppRootSignedInProviderSlicesWiringInput = (
  input: BuildAppRootSignedInProviderSlicesWiringInputArgs
): AppRootSignedInProviderSlicesWiringInput => ({
  settings: input.settingsAssemblyInput,
  shell: input.shell,
  shellLayout: input.shellLayout
});
