import type { AppShellSignedInAiModelSources } from "@/components/app/types/appShellSignedInAssemblySources.types";

/** Inputs for the signed-in center AI model selector slice (provider + settings error surface). */
export type AiChatModelsSignedInAssemblySliceInput = Pick<
  AppShellSignedInAiModelSources,
  | "aiModelOptions"
  | "aiModelLoading"
  | "handleSelectAiChatProviderModel"
  | "aiModelError"
  | "refreshAiModels"
>;
