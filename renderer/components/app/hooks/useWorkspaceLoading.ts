import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { normalizeSnapshot, shouldPromptToRemoveMissingWorkspace } from "@/components/app/logic/appUtils";
import type { WorkspaceLoadingState } from "@/components/app/types";
import type { UseWorkspaceLoadingArgs, UseWorkspaceLoadingResult } from "@/components/app/types/component.types";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { AppState } from "@shared/appTypes";
import { useEffect, useRef, useState } from "react";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";

export function useWorkspaceLoading({
  setUiState,
  captureError
}: UseWorkspaceLoadingArgs): UseWorkspaceLoadingResult {
  const snapshot = useCanonicalAppSnapshot();
  const [workspaceLoading, setWorkspaceLoading] = useState<WorkspaceLoadingState | null>(null);
  const workspaceLoadingTokenRef = useRef(0);
  const workspaceLoadingTimerIdsRef = useRef<number[]>([]);

  useEffect(() => () => {
    workspaceLoadingTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    workspaceLoadingTimerIdsRef.current = [];
  }, []);

  useEffect(() => {
    if (!workspaceLoading) {
      return;
    }

    if (snapshot?.project?.id !== workspaceLoading.projectId) {
      return;
    }

    clearWorkspaceLoadingTimers();
    setWorkspaceLoading(null);
  }, [snapshot?.project?.id, workspaceLoading]);

  useEffect(() => noraWorkspaceClient.onWorkspaceLoadingProgress((payload) => {
    setWorkspaceLoading((current) => {
      // Only create a new loading state for workspace transitions. Once a workspace
      // is already active, background refreshes for that same project should not
      // resurrect the blocking modal.
      if (!current && snapshot?.project?.id === payload.projectId) {
        return null;
      }

      const targetWorkspace = snapshot?.workspaces.find((workspace) => workspace.project.id === payload.projectId) ?? null;
      const targetProject = targetWorkspace?.project ?? null;
      const inferredKind = payload.command?.startsWith("ssh ") ? "ssh" : "local";
      const sshLocation = targetProject?.location?.kind === "ssh" ? targetProject.location : null;
      const targetLabel = inferredKind === "ssh"
        ? sshLocation
          ? `${sshLocation.user}@${sshLocation.host}${sshLocation.port ? `:${sshLocation.port}` : ""}`
          : "Remote workspace"
        : (targetProject?.rootPath || "Local workspace");

      // Initial workspace opens can report progress under a provisional identifier
      // before the final project id is known. When that handoff happens, keep the
      // existing loading token but rebind the modal to the resolved project id.
      return {
        token: current?.token ?? workspaceLoadingTokenRef.current + 1,
        projectId: payload.projectId,
        projectName: targetProject?.name || "Workspace",
        targetLabel,
        detail: payload.detail,
        command: payload.command,
        kind: inferredKind
      };
    });
  }), []);

  const clearWorkspaceLoadingTimers = (): void => {
    workspaceLoadingTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    workspaceLoadingTimerIdsRef.current = [];
  };

  const beginWorkspaceLoading = (projectId: string): number => {
    const targetWorkspace = snapshot?.workspaces.find((workspace) => workspace.project.id === projectId) ?? null;
    const targetProject = targetWorkspace?.project ?? null;
    const isSsh = targetProject?.location?.kind === "ssh";
    const token = ++workspaceLoadingTokenRef.current;
    const steps = isSsh
      ? [
          "Connecting to the saved SSH workspace...",
          "Checking repository details on the remote host...",
          "Loading saved sessions and worktrees...",
          "Refreshing workspace changes...",
          "Still waiting on the remote host to answer git and workspace checks..."
        ]
      : [
          "Opening workspace...",
          "Checking repository details...",
          "Loading saved sessions and worktrees...",
          "Refreshing workspace changes...",
          "Still waiting for the workspace refresh to finish..."
        ];
    const sshLocation = targetProject?.location?.kind === "ssh" ? targetProject.location : null;
    const targetLabel = sshLocation
      ? `${sshLocation.user}@${sshLocation.host}${sshLocation.port ? `:${sshLocation.port}` : ""}`
      : (targetProject?.rootPath || "Local workspace");

    clearWorkspaceLoadingTimers();
    setWorkspaceLoading({
      token,
      projectId,
      projectName: targetProject?.name || "Workspace",
      targetLabel,
      detail: steps[0],
      command: isSsh
        ? `ssh ${(sshLocation?.user ? `${sshLocation.user}@` : "")}${sshLocation?.host || "host"}${sshLocation?.port ? ` -p ${sshLocation.port}` : ""}`
        : "git rev-parse --show-toplevel",
      kind: isSsh ? "ssh" : "local"
    });

    steps.slice(1).forEach((detail, index) => {
      const timerId = window.setTimeout(() => {
        setWorkspaceLoading((current) =>
          current?.token === token
            ? {
                ...current,
                detail,
                command: current.command
              }
            : current
        );
      }, detail.startsWith("Still waiting") ? 6_000 : (index + 1) * 900);
      workspaceLoadingTimerIdsRef.current.push(timerId);
    });

    return token;
  };

  const finishWorkspaceLoading = (token: number): void => {
    clearWorkspaceLoadingTimers();
    setWorkspaceLoading((current) => (current?.token === token ? null : current));
  };

  const dismissWorkspaceLoading = (): void => {
    clearWorkspaceLoadingTimers();
    setWorkspaceLoading(null);
  };

  const focusWorkspaceWithRecovery = async (projectId: string): Promise<AppState | null> => {
    const loadingToken = beginWorkspaceLoading(projectId);
    try {
      const next = normalizeSnapshot(await noraWorkspaceClient.focusWorkspace(projectId));
      setUiState((current) => ({ ...current, snapshot: next }));
      const targetProject =
        next.workspaces.find((workspace) => workspace.project.id === projectId)?.project ??
        (next.project?.id === projectId ? next.project : null);
      const targetKind = targetProject?.location?.kind ?? "local";
      trackAnalyticsEvent("workspace.focused", {
        projectId: next.project?.id ?? projectId,
        requestedProjectId: projectId,
        projectName: targetProject?.name ?? next.project?.name ?? null,
        kind: targetKind,
        workspaceCount: snapshot?.workspaces.length ?? 0
      });
      return next;
    } catch (error: unknown) {
      if (shouldPromptToRemoveMissingWorkspace(error)) {
        setUiState((current) => ({
          ...current,
          removeMissingWorkspaceRoot: null,
          removeMissingWorkspaceError: error.message
        }));
        return null;
      }

      captureError(error);
      return null;
    } finally {
      finishWorkspaceLoading(loadingToken);
    }
  };

  return {
    workspaceLoading,
    dismissWorkspaceLoading,
    focusWorkspaceWithRecovery
  };
}
