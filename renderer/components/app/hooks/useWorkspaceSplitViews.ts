import { getWorkspaceProjectIds } from "@/components/app/logic/workspaceProjectIds";
import type { WorkspaceSplitViewsState } from "@/components/app/types";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import type { WorkspaceSplitViewCollection } from "@shared/appTypes";
import { createDefaultWorkspaceSplitViewCollection } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useEffect, useRef, useState } from "react";

export function useWorkspaceSplitViews() {
  const snapshot = useCanonicalAppSnapshot();
  const [workspaceSplitViews, setWorkspaceSplitViews] = useState<WorkspaceSplitViewsState>({});
  const workspaceSplitViewsRef = useRef<WorkspaceSplitViewsState>({});

  useEffect(() => {
    workspaceSplitViewsRef.current = workspaceSplitViews;
  }, [workspaceSplitViews]);

  useEffect(() => {
    if (!snapshot) {
      setWorkspaceSplitViews({});
      return;
    }

    const projectIds = getWorkspaceProjectIds(snapshot);
    if (!projectIds.length) {
      setWorkspaceSplitViews({});
      return;
    }

    let mounted = true;
    setWorkspaceSplitViews((current) => {
      const next: WorkspaceSplitViewsState = {};
      for (const projectId of projectIds) {
        next[projectId] = current[projectId] ?? {
          collection: createDefaultWorkspaceSplitViewCollection(),
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
            collection: await noraWorkspaceClient.getWorkspaceSplitViews(projectId),
            errorMessage: null
          };
        } catch (error: unknown) {
          return {
            projectId,
            collection: createDefaultWorkspaceSplitViewCollection(),
            errorMessage: error instanceof Error ? error.message : "Unable to load workspace split views."
          };
        }
      })
    ).then((entries) => {
      if (!mounted) {
        return;
      }

      setWorkspaceSplitViews(() => {
        const next: WorkspaceSplitViewsState = {};
        for (const projectId of projectIds) {
          const entry = entries.find((item) => item.projectId === projectId);
          next[projectId] = {
            collection: entry?.collection ?? createDefaultWorkspaceSplitViewCollection(),
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
  }, [snapshot?.project?.id, snapshot?.workspaces.map((workspace) => workspace.project.id).join("\n")]);

  const saveWorkspaceSplitViews = async (
    projectId: string,
    collection: WorkspaceSplitViewCollection
  ): Promise<WorkspaceSplitViewCollection> => {
    const previousState = workspaceSplitViewsRef.current[projectId] ?? {
      collection: createDefaultWorkspaceSplitViewCollection(),
      isLoading: false,
      errorMessage: null
    };

    setWorkspaceSplitViews((current) => ({
      ...current,
      [projectId]: {
        collection,
        isLoading: false,
        errorMessage: null
      }
    }));

    try {
      const savedCollection = await noraWorkspaceClient.saveWorkspaceSplitViews(projectId, collection);
      setWorkspaceSplitViews((current) => ({
        ...current,
        [projectId]: {
          collection: savedCollection,
          isLoading: false,
          errorMessage: null
        }
      }));
      return savedCollection;
    } catch (error: unknown) {
      setWorkspaceSplitViews((current) => ({
        ...current,
        [projectId]: {
          collection: previousState.collection,
          isLoading: false,
          errorMessage: error instanceof Error ? error.message : "Unable to save workspace split views."
        }
      }));
      throw error;
    }
  };

  const updateWorkspaceSplitViews = async (
    projectId: string,
    updater: (currentCollection: WorkspaceSplitViewCollection) => WorkspaceSplitViewCollection
  ): Promise<WorkspaceSplitViewCollection> => {
    const currentCollection =
      workspaceSplitViewsRef.current[projectId]?.collection ?? createDefaultWorkspaceSplitViewCollection();
    return saveWorkspaceSplitViews(projectId, updater(currentCollection));
  };

  return {
    workspaceSplitViews,
    saveWorkspaceSplitViews,
    updateWorkspaceSplitViews
  };
}
