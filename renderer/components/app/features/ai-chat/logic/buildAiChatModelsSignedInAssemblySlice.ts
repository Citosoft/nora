import type { AiChatModelsSignedInAssemblySliceInput } from "@/components/app/features/ai-chat/types/aiChatModelsSignedInAssemblySlice.types";
import type { AppShellSignedInAiModelSources } from "@/components/app/types/appShellSignedInAssemblySources.types";

export const buildAiChatModelsSignedInAssemblySlice = (
  input: AiChatModelsSignedInAssemblySliceInput
): AppShellSignedInAiModelSources => ({
  aiModelOptions: input.aiModelOptions,
  aiModelLoading: input.aiModelLoading,
  handleSelectAiChatProviderModel: input.handleSelectAiChatProviderModel,
  aiModelError: input.aiModelError,
  refreshAiModels: input.refreshAiModels
});
