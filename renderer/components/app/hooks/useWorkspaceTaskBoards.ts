import { getWorkspaceProjectIds } from "@/components/app/logic/workspaceProjectIds";
import type { WorkspaceTaskBoardsState } from "@/components/app/types";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import type { WorkspaceTaskBoard } from "@shared/appTypes";
import { createDefaultWorkspaceTaskBoard } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useEffect, useRef, useState } from "react";

export function useWorkspaceTaskBoards() {
  const snapshot = useCanonicalAppSnapshot();
  const [workspaceTaskBoards, setWorkspaceTaskBoards] = useState<WorkspaceTaskBoardsState>({});
  const workspaceTaskBoardsRef = useRef<WorkspaceTaskBoardsState>({});

  useEffect(() => {
    workspaceTaskBoardsRef.current = workspaceTaskBoards;
  }, [workspaceTaskBoards]);

  useEffect(() => {
    if (!snapshot) {
      setWorkspaceTaskBoards({});
      return;
    }

    const projectIds = getWorkspaceProjectIds(snapshot);
    if (!projectIds.length) {
      setWorkspaceTaskBoards({});
      return;
    }

    let mounted = true;
    setWorkspaceTaskBoards((current) => {
      const next: WorkspaceTaskBoardsState = {};
      for (const projectId of projectIds) {
        next[projectId] = current[projectId] ?? {
          board: createDefaultWorkspaceTaskBoard(),
          isLoading: true,
          errorMessage: null
        };
        next[projectId] = {
          ...next[projectId],
          isLoading: true,
          errorMessage: null
        };
      }
      return next;
    });

    Promise.all(
      projectIds.map(async (projectId) => {
        try {
          return {
            projectId,
            board: await noraWorkspaceClient.getWorkspaceTaskBoard(projectId),
            errorMessage: null
          };
        } catch (error: unknown) {
          return {
            projectId,
            board: createDefaultWorkspaceTaskBoard(),
            errorMessage: error instanceof Error ? error.message : "Unable to load workspace task board."
          };
        }
      })
    ).then((entries) => {
      if (!mounted) {
        return;
      }

      setWorkspaceTaskBoards(() => {
        const next: WorkspaceTaskBoardsState = {};
        for (const projectId of projectIds) {
          const entry = entries.find((item) => item.projectId === projectId);
          next[projectId] = {
            board: entry?.board ?? createDefaultWorkspaceTaskBoard(),
            isLoading: false,
            errorMessage: entry?.errorMessage ?? null
          };
        }
        return next;
      });
    });

    return () => {
      mounted = false;
    };
  }, [snapshot?.project?.id, snapshot?.workspaces.map((workspace) => workspace.project.id).join("\n"), snapshot?.changes.map((change) => change.path).join("\n")]);

  const saveWorkspaceTaskBoard = async (projectId: string, board: WorkspaceTaskBoard): Promise<WorkspaceTaskBoard> => {
    const previousState = workspaceTaskBoardsRef.current[projectId] ?? {
      board: createDefaultWorkspaceTaskBoard(),
      isLoading: false,
      errorMessage: null
    };

    setWorkspaceTaskBoards((current) => ({
      ...current,
      [projectId]: {
        board,
        isLoading: false,
        errorMessage: null
      }
    }));

    try {
      const savedBoard = await noraWorkspaceClient.saveWorkspaceTaskBoard(projectId, board);
      setWorkspaceTaskBoards((current) => ({
        ...current,
        [projectId]: {
          board: savedBoard,
          isLoading: false,
          errorMessage: null
        }
      }));
      return savedBoard;
    } catch (error: unknown) {
      setWorkspaceTaskBoards((current) => ({
        ...current,
        [projectId]: {
          board: previousState.board,
          isLoading: false,
          errorMessage: error instanceof Error ? error.message : "Unable to save workspace task board."
        }
      }));
      throw error;
    }
  };

  const updateWorkspaceTaskBoard = async (
    projectId: string,
    updater: (currentBoard: WorkspaceTaskBoard) => WorkspaceTaskBoard
  ): Promise<WorkspaceTaskBoard> => {
    const currentBoard = workspaceTaskBoardsRef.current[projectId]?.board ?? createDefaultWorkspaceTaskBoard();
    return saveWorkspaceTaskBoard(projectId, updater(currentBoard));
  };

  return {
    workspaceTaskBoards,
    saveWorkspaceTaskBoard,
    updateWorkspaceTaskBoard
  };
}
