import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { formatForgeIssueInstruction } from "@/components/app/logic/appUtils";
import { launchAgentWithInstruction } from "@/components/app/logic/launchAgentWithInstruction";
import type { StatusBarContextValue } from "@/components/app/logic/statusBarContext";
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
  handleOpenProjectInIde: (ideId: string) => Promise<void>;
} {
  const snapshot = useCanonicalAppSnapshot();
  const handleSpawnForgeIssueAgent = useCallback(async (toolId: string): Promise<void> => {
    if (!snapshot?.project || !forgeWorkItemDetail || forgeWorkItemDetail.kind !== "issue") {
      return;
    }

    const instruction = formatForgeIssueInstruction(forgeWorkItemDetail);
    const payload: CreateAgentPayload = {
      toolId,
      name: `Issue #${forgeWorkItemDetail.item.number}`,
      task: `Work on issue #${forgeWorkItemDetail.item.number}: ${forgeWorkItemDetail.item.title}`,
      commandOverride: "",
      mode: "write",
      target: { kind: "new" }
    };
    try {
      await launchAgentWithInstruction({
        payload,
        createAgent: (agentPayload) => runWithStatus("Creating agent", () => noraAgentClient.createAgent(agentPayload)),
        instruction,
        handoffStatusMessage: "Sending issue details",
        statusBar,
        updateSnapshot: updateSnapshotState,
        trackCreation: trackForgeIssueAgentCreation,
        focusAgent: async (focusedAgentId: string) => {
          await safelyAndRefresh(() => noraAgentClient.focusAgent(focusedAgentId));
        }
      });
    } catch (error: unknown) {
      captureError(error);
    }
  }, [
    captureError,
    forgeWorkItemDetail,
    runWithStatus,
    safelyAndRefresh,
    snapshot?.project,
    statusBar,
    trackForgeIssueAgentCreation,
    updateSnapshotState
  ]);

  const handleOpenProjectInIde = useCallback(async (ideId: string): Promise<void> => {
    if (!snapshot?.project || !canOpenProjectInIde) {
      return;
    }

    const statusId = statusBar.beginStatus("Opening workspace in IDE", true);
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
    handleOpenProjectInIde
  };
}
