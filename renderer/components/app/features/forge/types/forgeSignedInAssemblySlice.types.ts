import type { ForgeViewerTabState } from "@/components/app/types";
import type { AppShellSignedInForgeSources } from "@/components/app/types/appShellSignedInAssemblySources.types";
import type { UseForgeIntegrationResult } from "@/components/app/types/appHooks.types";
import type { ForgeWorkItemSummary } from "@shared/appTypes";

/** Narrow cross-surface inputs the Forge slice needs beyond `useForgeIntegration`. */
export type ForgeSignedInAssemblySliceInput = {
  integration: UseForgeIntegrationResult;
  resolveGitlabForgeRepoOverride: (item: ForgeWorkItemSummary) => { host: string; fullName: string } | null;
  handleSpawnForgeIssueAgent: (toolId: string) => Promise<void>;
  handleSpawnForgeReviewAgent: AppShellSignedInForgeSources["handleSpawnForgeReviewAgent"];
  focusedForgeViewerTab: ForgeViewerTabState | null;
};
