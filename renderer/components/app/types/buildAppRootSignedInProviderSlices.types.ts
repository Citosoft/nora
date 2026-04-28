import type { AppShellProviderSlicesResult } from "@/components/app/types/appShellProviderSliceAssembly.types";
import type { AppShellLayoutSlice } from "@/components/app/types/appShellLayoutSlice.types";
import type { AppShellSettingsRuntimeAssemblyInput } from "@/components/app/types/appShellSettingsRuntimeAssembly.types";
import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";
import type { AssembleSignedInShellAssemblyInput } from "@/components/app/types/assembleSignedInShellAssembly.types";

export type BuildAppRootSignedInProviderSlicesDeps = {
  settingsAssemblyInput: AppShellSettingsRuntimeAssemblyInput;
  signedInShellAssemblyInput: AssembleSignedInShellAssemblyInput;
  shellLayout: AppShellLayoutSlice;
};

export type BuildAppRootSignedInProviderSlicesResult = AppShellProviderSlicesResult & {
  signedInAssemblySources: AppShellSignedInAssemblySources;
};
