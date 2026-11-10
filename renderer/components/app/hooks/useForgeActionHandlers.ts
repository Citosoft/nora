import { useNativeRuntimePorts } from "./useNativeRuntimePorts";
import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { formatForgeIssueInstruction } from "@/components/app/logic/appUtils";
import {
  buildForgeReviewFileInstruction,
  buildForgeReviewInstruction,
  createForgeReviewHandoffRelativePath,
  resolveForgeReviewHandoffDisplayPath
} from "@/components/app/logic/forgeReviewHandoff";
import { launchAgentWithInstruction } from "@/components/app/logic/launchAgentWithInstruction";
import type { StatusBarContextValue } from "@/components/app/logic/statusBarContext";
import type {
  ForgeReviewAgentTargetMode,
  ForgeReviewCommentSelection
} from "@/components/app/types/forgeReviewHandoff.types";
import type { AppState, CreateAgentPayload, ForgeWorkItemDetail } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback } from "react";

export function useForgeActionHandlers({
  forgeWorkItemDetail,
  canOpenProjectInIde,
  runWithStatus,
  statusBar,
  updateSnapshotState,
  safelyAndRefresh,
  captureError,
  trackForgeIssueAgentCreation
}: {
  forgeWorkItemDetail: ForgeWorkItemDetail | null;
  canOpenProjectInIde: boolean;
  runWithStatus: (message: string, action: () => Promise<AppState>) => Promise<AppState | null>;
  statusBar: StatusBarContextValue;
  updateSnapshotState: (next: AppState) => void;
  safelyAndRefresh: (
    action: () => Promise<AppState>,
    statusMessage?: string
  ) => Promise<AppState | null>;
  captureError: (error: unknown) => void;
  trackForgeIssueAgentCreation: (payload: CreateAgentPayload) => void;
}): {
  handleSpawnForgeIssueAgent: (toolId: string) => Promise<void>;
  handleSpawnForgeReviewAgent: (
    toolId: string,
    selections: ForgeReviewCommentSelection[],
    targetMode: ForgeReviewAgentTargetMode
  ) => Promise<void>;
  handleOpenProjectInIde: (ideId: string) => Promise<void>;
} {
  const snapshot = useCanonicalAppSnapshot();
  const native = useNativeRuntimePorts();
  const handleSpawnForgeIssueAgent = useCallback(async (_toolId: string): Promise<void> => {
    if (!snapshot?.project || forgeWorkItemDetail?.kind !== "issue") return;
    try { await native.launch({ projectId: snapshot.project.id, text: formatForgeIssueInstruction(forgeWorkItemDetail) }); }
    catch (cause) { captureError(cause); }
  }, [native.launch, snapshot?.project, forgeWorkItemDetail, captureError]);
  const handleSpawnForgeReviewAgent = useCallback(async (_toolId: string, selections: ForgeReviewCommentSelection[], _targetMode: ForgeReviewAgentTargetMode): Promise<void> => {
    if (!snapshot?.project || forgeWorkItemDetail?.kind !== "pull_request" || !selections.length) return;
    try { await native.launch({ projectId: snapshot.project.id, text: buildForgeReviewInstruction(forgeWorkItemDetail, selections) }); }
    catch (cause) { captureError(cause); }
  }, [native.launch, snapshot?.project, forgeWorkItemDetail, captureError]);

  const handleOpenProjectInIde = useCallback(async (ideId: string): Promise<void> => {
    if (!snapshot?.project || !canOpenProjectInIde) {
      return;
    }

    const statusId = statusBar.beginStatus("Opening project in IDE", true);
    try {
      await noraSystemClient.openProjectInIde(ideId, snapshot.project.rootPath);
    } catch (error: unknown) {
      captureError(error);
    } finally {
      statusBar.endStatus(statusId);
    }
  }, [canOpenProjectInIde, captureError, snapshot?.project, statusBar]);

  return {
    handleSpawnForgeIssueAgent,
    handleSpawnForgeReviewAgent,
    handleOpenProjectInIde
  };
}
