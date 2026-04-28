import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import type {
  WorkspaceFileTreeState,
  WorkspaceNotesState,
  WorkspaceSpecsState,
  WorkspaceTasksState
} from "@/components/app/types";
import type { UseWorkspaceResourcesResult } from "@/components/app/types/appHooks.types";
import type { AppState, WorkspaceNoteSummary, WorkspaceSpecSummary } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback, useEffect, useState } from "react";

const EMPTY_FILE_TREE_STATE: WorkspaceFileTreeState = {
  rootPath: null,
  paths: [],
  directoryPaths: [],
  isLoading: false,
  errorMessage: null
};

function getUniqueWorkspaceProjects(snapshot: AppState | null) {
  if (!snapshot) {
    return [];
  }

  const workspaceProjects = [
    ...(snapshot.project ? [snapshot.project] : []),
    ...snapshot.workspaces.map((workspace) => workspace.project)
  ];

  return Array.from(new Map(workspaceProjects.map((project) => [project.id, project])).values());
}

export function useWorkspaceResources(): UseWorkspaceResourcesResult {
  const snapshot = useCanonicalAppSnapshot();
  const [workspaceFileTree, setWorkspaceFileTree] = useState<WorkspaceFileTreeState>(EMPTY_FILE_TREE_STATE);
  const [workspaceTasks, setWorkspaceTasks] = useState<WorkspaceTasksState>({});
  const [workspaceSpecs, setWorkspaceSpecs] = useState<WorkspaceSpecsState>({});
  const [workspaceNotes, setWorkspaceNotes] = useState<WorkspaceNotesState>({});

  const reloadWorkspaceTasksForProject = useCallback(async (projectId: string): Promise<void> => {
    setWorkspaceTasks((current) => ({
      ...current,
      [projectId]: {
        tasks: current[projectId]?.tasks ?? [],
        isLoading: true,
        errorMessage: null
      }
    }));

    try {
      const tasks = await noraWorkspaceClient.listWorkspaceTasks(projectId);
      setWorkspaceTasks((current) => ({
        ...current,
        [projectId]: {
          tasks,
          isLoading: false,
          errorMessage: null
        }
      }));
    } catch (error: unknown) {
      setWorkspaceTasks((current) => ({
        ...current,
        [projectId]: {
          tasks: current[projectId]?.tasks ?? [],
          isLoading: false,
          errorMessage: error instanceof Error ? error.message : "Unable to load workspace tasks."
        }
      }));
    }
  }, []);

  const reloadWorkspaceSpecsForProject = useCallback(async (projectId: string): Promise<void> => {
    setWorkspaceSpecs((current) => ({
      ...current,
      [projectId]: {
        specs: current[projectId]?.specs ?? [],
        isLoading: true,
        errorMessage: null
      }
    }));

    try {
      const specs = await noraWorkspaceClient.listWorkspaceSpecs(projectId);
      setWorkspaceSpecs((current) => ({
        ...current,
        [projectId]: {
          specs,
          isLoading: false,
          errorMessage: null
        }
      }));
    } catch (error: unknown) {
      setWorkspaceSpecs((current) => ({
        ...current,
        [projectId]: {
          specs: current[projectId]?.specs ?? [],
          isLoading: false,
          errorMessage: error instanceof Error ? error.message : "Unable to load workspace specs."
        }
      }));
    }
  }, []);

  const reloadWorkspaceNotesForProject = useCallback(async (projectId: string): Promise<void> => {
    setWorkspaceNotes((current) => ({
      ...current,
      [projectId]: {
        notes: current[projectId]?.notes ?? [],
        isLoading: true,
        errorMessage: null
      }
    }));

    try {
      const notes = await noraWorkspaceClient.listWorkspaceNotes(projectId);
      setWorkspaceNotes((current) => ({
        ...current,
        [projectId]: {
          notes,
          isLoading: false,
          errorMessage: null
        }
      }));
    } catch (error: unknown) {
      setWorkspaceNotes((current) => ({
        ...current,
        [projectId]: {
          notes: current[projectId]?.notes ?? [],
          isLoading: false,
          errorMessage: error instanceof Error ? error.message : "Unable to load workspace notes."
        }
      }));
    }
  }, []);

  useEffect(() => {
    const projectId = snapshot?.project?.id ?? null;
    const rootPath = snapshot?.changesRoot || snapshot?.project?.rootPath || null;

    if (!projectId) {
      setWorkspaceFileTree(EMPTY_FILE_TREE_STATE);
      return;
    }

    let mounted = true;
    setWorkspaceFileTree((current) => {
      const shouldShowLoading = current.rootPath !== rootPath || current.paths.length === 0;
      return {
        rootPath,
        paths: current.paths,
        directoryPaths: current.directoryPaths,
        isLoading: shouldShowLoading,
        errorMessage: null
      };
    });

    Promise.all([
      noraWorkspaceClient.listWorkspaceFiles(projectId, rootPath || undefined),
      noraWorkspaceClient.listWorkspaceDirectories(projectId, rootPath || undefined)
    ]).then(([paths, directoryPaths]) => {
      if (!mounted) {
        return;
      }

      setWorkspaceFileTree({
        rootPath,
        paths,
        directoryPaths,
        isLoading: false,
        errorMessage: null
      });
    }).catch((error: unknown) => {
      if (!mounted) {
        return;
      }

      setWorkspaceFileTree({
        rootPath,
        paths: [],
        directoryPaths: [],
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : "Unable to load workspace files."
      });
    });

    return () => {
      mounted = false;
    };
  }, [snapshot?.project?.id, snapshot?.changesRoot, snapshot?.changes.map((change) => change.path).join("\n")]);

  useEffect(() => {
    const uniqueProjects = getUniqueWorkspaceProjects(snapshot);

    if (!uniqueProjects.length) {
      setWorkspaceTasks({});
      return;
    }

    let mounted = true;
    setWorkspaceTasks((current) => {
      const next: WorkspaceTasksState = {};
      for (const project of uniqueProjects) {
        next[project.id] = current[project.id] ?? {
          tasks: [],
          isLoading: true,
          errorMessage: null
        };
        next[project.id] = {
          ...next[project.id],
          isLoading: true,
          errorMessage: null
        };
      }
      return next;
    });

    Promise.all(
      uniqueProjects.map(async (project) => {
        try {
          return {
            projectId: project.id,
            tasks: await noraWorkspaceClient.listWorkspaceTasks(project.id),
            errorMessage: null
          };
        } catch (error: unknown) {
          return {
            projectId: project.id,
            tasks: [],
            errorMessage: error instanceof Error ? error.message : "Unable to load workspace tasks."
          };
        }
      })
    ).then((entries) => {
      if (!mounted) {
        return;
      }

      setWorkspaceTasks(() => {
        const next: WorkspaceTasksState = {};
        for (const project of uniqueProjects) {
          const entry = entries.find((item) => item.projectId === project.id);
          next[project.id] = {
            tasks: entry?.tasks ?? [],
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

  useEffect(() => {
    const uniqueProjects = getUniqueWorkspaceProjects(snapshot);

    if (!uniqueProjects.length) {
      setWorkspaceSpecs({});
      return;
    }

    let mounted = true;
    setWorkspaceSpecs((current) => {
      const next: WorkspaceSpecsState = {};
      for (const project of uniqueProjects) {
        next[project.id] = current[project.id] ?? {
          specs: [],
          isLoading: true,
          errorMessage: null
        };
        next[project.id] = {
          ...next[project.id],
          isLoading: true,
          errorMessage: null
        };
      }
      return next;
    });

    Promise.all(
      uniqueProjects.map(async (project) => {
        try {
          return {
            projectId: project.id,
            specs: await noraWorkspaceClient.listWorkspaceSpecs(project.id),
            errorMessage: null
          };
        } catch (error: unknown) {
          return {
            projectId: project.id,
            specs: [] as WorkspaceSpecSummary[],
            errorMessage: error instanceof Error ? error.message : "Unable to load workspace specs."
          };
        }
      })
    ).then((entries) => {
      if (!mounted) {
        return;
      }

      setWorkspaceSpecs(() => {
        const next: WorkspaceSpecsState = {};
        for (const project of uniqueProjects) {
          const entry = entries.find((item) => item.projectId === project.id);
          next[project.id] = {
            specs: entry?.specs ?? [],
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

  useEffect(() => {
    const uniqueProjects = getUniqueWorkspaceProjects(snapshot);

    if (!uniqueProjects.length) {
      setWorkspaceNotes({});
      return;
    }

    let mounted = true;
    setWorkspaceNotes((current) => {
      const next: WorkspaceNotesState = {};
      for (const project of uniqueProjects) {
        next[project.id] = current[project.id] ?? {
          notes: [],
          isLoading: true,
          errorMessage: null
        };
        next[project.id] = {
          ...next[project.id],
          isLoading: true,
          errorMessage: null
        };
      }
      return next;
    });

    Promise.all(
      uniqueProjects.map(async (project) => {
        try {
          return {
            projectId: project.id,
            notes: await noraWorkspaceClient.listWorkspaceNotes(project.id),
            errorMessage: null
          };
        } catch (error: unknown) {
          return {
            projectId: project.id,
            notes: [] as WorkspaceNoteSummary[],
            errorMessage: error instanceof Error ? error.message : "Unable to load workspace notes."
          };
        }
      })
    ).then((entries) => {
      if (!mounted) {
        return;
      }

      setWorkspaceNotes(() => {
        const next: WorkspaceNotesState = {};
        for (const project of uniqueProjects) {
          const entry = entries.find((item) => item.projectId === project.id);
          next[project.id] = {
            notes: entry?.notes ?? [],
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

  return {
    workspaceFileTree,
    setWorkspaceFileTree,
    workspaceTasks,
    workspaceSpecs,
    workspaceNotes,
    setWorkspaceTasks,
    setWorkspaceSpecs,
    setWorkspaceNotes,
    reloadWorkspaceTasksForProject,
    reloadWorkspaceSpecsForProject,
    reloadWorkspaceNotesForProject
  };
}
