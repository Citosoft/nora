import type { ForgeViewerTabState } from "@/components/app/types";
import type { ForgeWorkItemDetail } from "@shared/appTypes";

export type UseAppRootForgeViewerWorkItemDetailEffectArgs = {
  focusedForgeViewerTab: ForgeViewerTabState | null;
  forgeWorkItemDetail: ForgeWorkItemDetail | null;
  loadForgeWorkItemDetail: (
    kind: ForgeViewerTabState["kind"],
    number: number,
    repoOverride: { host: string; fullName: string } | null
  ) => void;
};
