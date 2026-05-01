import type { UseAppRootForgeViewerWorkItemDetailEffectArgs } from "@/components/app/types/useAppRootForgeViewerWorkItemDetailEffect.types";
import { useEffect } from "react";

export const useAppRootForgeViewerWorkItemDetailEffect = ({
  focusedForgeViewerTab,
  forgeWorkItemDetail,
  loadForgeWorkItemDetail
}: UseAppRootForgeViewerWorkItemDetailEffectArgs): void => {
  useEffect(() => {
    if (!focusedForgeViewerTab) {
      return;
    }
    if (focusedForgeViewerTab.kind === "workflow_run") {
      return;
    }

    const activeDetailRepo = forgeWorkItemDetail?.item.sourceRepository?.trim() || null;
    const focusedTabRepo = focusedForgeViewerTab.forgeRepoFullNameOverride?.trim() || null;
    if (
      forgeWorkItemDetail &&
      forgeWorkItemDetail.kind === focusedForgeViewerTab.kind &&
      forgeWorkItemDetail.item.number === focusedForgeViewerTab.number &&
      activeDetailRepo === focusedTabRepo
    ) {
      return;
    }

    const repoOverride =
      focusedForgeViewerTab.forgeRepoHostOverride && focusedForgeViewerTab.forgeRepoFullNameOverride
        ? {
            host: focusedForgeViewerTab.forgeRepoHostOverride,
            fullName: focusedForgeViewerTab.forgeRepoFullNameOverride
          }
        : null;
    void loadForgeWorkItemDetail(focusedForgeViewerTab.kind, focusedForgeViewerTab.number, repoOverride);
  }, [focusedForgeViewerTab, forgeWorkItemDetail, loadForgeWorkItemDetail]);
};
