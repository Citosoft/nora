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
  const handleSpawnForgeIssueAgent = useCallback(async (toolId: string): Promise<void> => {
    if (!snapshot?.project || !forgeWorkItemDetail || forgeWorkItemDetail.kind !== "issue") {
      return;
    }

    const instruction = formatForgeIssueInstruction(forgeWorkItemDetail);
    const workspaceInstructionPath = snapshot.project.workspaceInstructionFile?.absolutePath ?? null;
    const payload: CreateAgentPayload = {
      toolId,
      name: `Issue #${forgeWorkItemDetail.item.number}`,
      task: `Work on issue #${forgeWorkItemDetail.item.number}: ${forgeWorkItemDetail.item.title}`,
      commandOverride: "",
      launchSource: "forge-issue",
      mode: "write",
      target: { kind: "new" }
    };
    try {
      await launchAgentWithInstruction({
        payload,
        createAgent: (agentPayload) => runWithStatus("Creating agent", () => noraAgentClient.createAgent(agentPayload)),
        instruction,
        prompt: {
          source: "forge-issue",
          title: "Issue details",
          contextSelections: payload.contextSelections ?? [],
          workspacePaths: workspaceInstructionPath ? [{ path: workspaceInstructionPath, kind: "file" }] : [],
          references: [
            { kind: "workspace-path", label: "Issue URL", value: forgeWorkItemDetail.item.webUrl },
            ...(workspaceInstructionPath
              ? [{ kind: "workspace-path" as const, label: "Workspace instructions", value: workspaceInstructionPath }]
              : [])
          ]
        },
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

  const handleSpawnForgeReviewAgent = useCallback(async (
    toolId: string,
    selections: ForgeReviewCommentSelection[],
    targetMode: ForgeReviewAgentTargetMode
  ): Promise<void> => {
    if (!snapshot?.project || !forgeWorkItemDetail || forgeWorkItemDetail.kind !== "pull_request" || !selections.length) {
      return;
    }

    const fullInstruction = buildForgeReviewInstruction(forgeWorkItemDetail, selections);
    if (!fullInstruction) {
      return;
    }

    const handoffRelativePath = createForgeReviewHandoffRelativePath(forgeWorkItemDetail);
    await noraWorkspaceClient.writeWorkspaceFile({
      projectId: snapshot.project.id,
      path: handoffRelativePath,
      content: fullInstruction
    });
    const handoffDisplayPath = resolveForgeReviewHandoffDisplayPath(snapshot.project.rootPath, handoffRelativePath);
    const instruction = buildForgeReviewFileInstruction({
      detail: forgeWorkItemDetail,
      handoffPath: handoffDisplayPath,
      selectionCount: selections.length
    });
    const workspaceInstructionPath = snapshot.project.workspaceInstructionFile?.absolutePath ?? null;
    const payload: CreateAgentPayload = {
      toolId,
      name: `MR #${forgeWorkItemDetail.item.number} review`,
      task: `Address ${selections.length} review comment${selections.length === 1 ? "" : "s"} on MR #${forgeWorkItemDetail.item.number}: ${forgeWorkItemDetail.item.title}`,
      commandOverride: "",
      launchSource: "forge-review",
      mode: "write",
      target: targetMode === "current-branch" ? { kind: "root" } : { kind: "new" }
    };
    try {
      await launchAgentWithInstruction({
        payload,
        createAgent: (agentPayload) => runWithStatus("Creating agent", () => noraAgentClient.createAgent(agentPayload)),
        instruction,
        prompt: {
          source: "forge-review",
          title: "Merge request review comments",
          contextSelections: payload.contextSelections ?? [],
          workspacePaths: workspaceInstructionPath ? [{ path: workspaceInstructionPath, kind: "file" }] : [],
          references: [
            { kind: "workspace-path", label: "Merge request URL", value: forgeWorkItemDetail.item.webUrl },
            ...(workspaceInstructionPath
              ? [{ kind: "workspace-path" as const, label: "Workspace instructions", value: workspaceInstructionPath }]
              : [])
          ]
        },
        handoffStatusMessage: "Sending review comments",
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
    handleSpawnForgeReviewAgent,
    handleOpenProjectInIde
  };
}
