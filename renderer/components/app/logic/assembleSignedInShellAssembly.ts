import { buildSignedInShellAssemblyWiringFromParts } from "@/components/app/logic/buildSignedInShellAssemblyWiringFromParts";
import { buildSignedInShellSources } from "@/components/app/logic/buildSignedInShellSources";
import type { AssembleSignedInShellAssemblyInput } from "@/components/app/types/assembleSignedInShellAssembly.types";
import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";

export const assembleSignedInShellAssembly = (
  input: AssembleSignedInShellAssemblyInput
): AppShellSignedInAssemblySources => {
  const {
    core,
    workspaceCatalog,
    workspaceContent,
    forge,
    forgeWorkItemMutators,
    vercel,
    gitBranches,
    sessionSurface,
    centerTabs,
    aiModels,
    modalExtras,
    workspaceSidebarRest,
    changesFileHandlers,
    chromeShell
  } = input;

  const sources = buildSignedInShellSources({
    core,
    workspaceCatalog,
    workspaceContent,
    forge,
    forgeWorkItemMutators,
    vercel,
    gitBranches,
    sessionSurface,
    centerTabs,
    aiModels,
    modalExtras,
    workspaceSidebarRest,
    changesFileHandlers,
    chromeShell
  });

  return buildSignedInShellAssemblyWiringFromParts(
    sources.core,
    sources.workspaceCatalog,
    sources.workspaceContent,
    sources.forge,
    sources.forgeWorkItemMutators,
    sources.vercel,
    sources.gitBranches,
    sources.sessionSurface,
    sources.centerTabs,
    sources.aiModels,
    sources.modalExtras,
    sources.workspaceSidebarRest,
    sources.changesFileHandlers,
    sources.chromeShell
  );
};
