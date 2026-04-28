import { buildAiChatModelsSignedInAssemblySlice } from "@/components/app/features/ai-chat/logic/buildAiChatModelsSignedInAssemblySlice";
import { buildForgeSignedInAssemblySlice } from "@/components/app/features/forge/logic/buildForgeSignedInAssemblySlice";
import { buildForgeWorkItemMutatorsSlice } from "@/components/app/features/forge/logic/buildForgeWorkItemMutatorsSlice";
import { buildVercelSignedInAssemblySlice } from "@/components/app/features/vercel/logic/buildVercelSignedInAssemblySlice";
import { buildWorkspaceCenterTabsSignedInSlice } from "@/components/app/features/workspace-session/logic/buildWorkspaceCenterTabsSignedInSlice";
import { buildWorkspaceSessionSurfaceSignedInSlice } from "@/components/app/features/workspace-session/logic/buildWorkspaceSessionSurfaceSignedInSlice";
import type { AppRootSignedInProviderSlicesWiringInput } from "@/components/app/types/appRootSignedInProviderSlicesWiring.types";
import type { AssembleSignedInShellAssemblyInput } from "@/components/app/types/assembleSignedInShellAssembly.types";
import type { BuildAppRootSignedInProviderSlicesDeps } from "@/components/app/types/buildAppRootSignedInProviderSlices.types";

export const assembleSignedInShellAssemblyFromAppRootWiring = (
  w: AppRootSignedInProviderSlicesWiringInput["shell"]
): AssembleSignedInShellAssemblyInput => ({
  core: w.core,
  workspaceCatalog: w.workspaceCatalog,
  workspaceContent: w.workspaceContent,
  forge: buildForgeSignedInAssemblySlice(w.forgeSliceInput),
  forgeWorkItemMutators: buildForgeWorkItemMutatorsSlice(w.forgeSliceInput.integration),
  vercel: buildVercelSignedInAssemblySlice(w.vercelSliceInput),
  gitBranches: w.gitBranches,
  sessionSurface: buildWorkspaceSessionSurfaceSignedInSlice(w.sessionSurfaceSliceInput),
  centerTabs: buildWorkspaceCenterTabsSignedInSlice(w.centerTabsSliceInput),
  aiModels: buildAiChatModelsSignedInAssemblySlice(w.aiModelsSliceInput),
  modalExtras: w.modalExtras,
  workspaceSidebarRest: w.workspaceSidebarRest,
  changesFileHandlers: w.changesFileHandlers,
  chromeShell: w.chromeShell
});

export const buildAppRootSignedInProviderSlicesDeps = (
  input: AppRootSignedInProviderSlicesWiringInput
): BuildAppRootSignedInProviderSlicesDeps => ({
  settingsAssemblyInput: input.settings,
  signedInShellAssemblyInput: assembleSignedInShellAssemblyFromAppRootWiring(input.shell),
  shellLayout: input.shellLayout
});
