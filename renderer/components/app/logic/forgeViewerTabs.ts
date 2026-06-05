import type { ForgeViewerTabState } from "@/components/app/types";
import type { ForgeWorkItemKind } from "@shared/appTypes";

export function createForgeViewerTab(
  projectId: string,
  kind: ForgeWorkItemKind | "workflow_run",
  number: number,
  title: string,
  repoOverride?: { host: string; fullName: string } | null
): ForgeViewerTabState {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `forge-viewer-tab-${Date.now()}`,
    projectId,
    kind,
    number,
    title: title.trim() || (kind === "workflow_run" ? `Run #${number}` : `${kind === "pull_request" ? "PR" : "Issue"} #${number}`),
    forgeRepoHostOverride: repoOverride?.host ?? null,
    forgeRepoFullNameOverride: repoOverride?.fullName ?? null
  };
}
