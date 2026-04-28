import type { UseForgeIntegrationResult } from "@/components/app/types/appHooks.types";
import type { AppShellSignedInForgeWorkItemMutatorSources } from "@/components/app/types/appShellSignedInAssemblySources.types";

export const buildForgeWorkItemMutatorsSlice = (
  integration: UseForgeIntegrationResult
): AppShellSignedInForgeWorkItemMutatorSources => ({
  setForgeWorkItemDetail: integration.setForgeWorkItemDetail,
  setForgeWorkItemDetailErrorMessage: integration.setForgeWorkItemDetailErrorMessage
});
