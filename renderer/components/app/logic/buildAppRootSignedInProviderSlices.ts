import { assembleSignedInShellAssembly } from "@/components/app/logic/assembleSignedInShellAssembly";
import { buildSignedInAppShellProviderSlices } from "@/components/app/logic/buildAppShellProviderSlices";
import { buildSettingsRuntimeInput } from "@/components/app/logic/buildSettingsRuntimeInput";
import type {
  BuildAppRootSignedInProviderSlicesDeps,
  BuildAppRootSignedInProviderSlicesResult
} from "@/components/app/types/buildAppRootSignedInProviderSlices.types";

export const buildAppRootSignedInProviderSlices = (
  deps: BuildAppRootSignedInProviderSlicesDeps
): BuildAppRootSignedInProviderSlicesResult => {
  const settingsProcessed = buildSettingsRuntimeInput(deps.settingsAssemblyInput);
  const signedInAssemblySources = assembleSignedInShellAssembly(deps.signedInShellAssemblyInput);
  return {
    ...buildSignedInAppShellProviderSlices({
      ...signedInAssemblySources,
      settings: settingsProcessed,
      shellLayout: deps.shellLayout
    }),
    signedInAssemblySources
  };
};
