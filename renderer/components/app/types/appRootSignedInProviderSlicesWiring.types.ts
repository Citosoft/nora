import type { AiChatModelsSignedInAssemblySliceInput } from "@/components/app/features/ai-chat/types/aiChatModelsSignedInAssemblySlice.types";
import type { ForgeSignedInAssemblySliceInput } from "@/components/app/features/forge/types/forgeSignedInAssemblySlice.types";
import type { VercelSignedInAssemblySliceInput } from "@/components/app/features/vercel/types/vercelSignedInAssemblySlice.types";
import type { WorkspaceSessionSurfaceSignedInSliceInput } from "@/components/app/features/workspace-session/types/workspaceSessionSignedInAssemblySlice.types";
import type { AppShellLayoutSlice } from "@/components/app/types/appShellLayoutSlice.types";
import type { AppShellSettingsRuntimeAssemblyInput } from "@/components/app/types/appShellSettingsRuntimeAssembly.types";
import type { AppShellSignedInCenterTabsSources } from "@/components/app/types/appShellSignedInAssemblySources.types";
import type { AssembleSignedInShellAssemblyInput } from "@/components/app/types/assembleSignedInShellAssembly.types";

/**
 * Shell assembly wiring from `AppRoot`: slice builders run in `assembleSignedInShellAssemblyFromAppRootWiring`.
 * Pre-assembled fields match `AssembleSignedInShellAssemblyInput`; forge/vercel/session/center/ai are raw slice inputs.
 */
export type AppRootSignedInShellAssemblyWiring = Omit<
  AssembleSignedInShellAssemblyInput,
  "forge" | "forgeWorkItemMutators" | "vercel" | "sessionSurface" | "centerTabs" | "aiModels"
> & {
  forgeSliceInput: ForgeSignedInAssemblySliceInput;
  vercelSliceInput: VercelSignedInAssemblySliceInput;
  sessionSurfaceSliceInput: WorkspaceSessionSurfaceSignedInSliceInput;
  centerTabsSliceInput: AppShellSignedInCenterTabsSources;
  aiModelsSliceInput: AiChatModelsSignedInAssemblySliceInput;
};

/** Single bundle passed from `AppRoot` into `buildAppRootSignedInProviderSlicesDeps`. */
export type AppRootSignedInProviderSlicesWiringInput = {
  settings: AppShellSettingsRuntimeAssemblyInput;
  shell: AppRootSignedInShellAssemblyWiring;
  shellLayout: AppShellLayoutSlice;
};
