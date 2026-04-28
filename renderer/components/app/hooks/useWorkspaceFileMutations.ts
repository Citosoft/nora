import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import type { UseWorkspaceFileMutationsArgs, UseWorkspaceFileMutationsResult } from "@/components/app/types/appHooks.types";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback } from "react";

export function useWorkspaceFileMutations({
  workspaceFileTree,
  setWorkspaceFileTree,
  fileEditorState,
  setFileEditorState,
  safely,
  statusBar
}: UseWorkspaceFileMutationsArgs): UseWorkspaceFileMutationsResult {
  const snapshot = useCanonicalAppSnapshot();
  const renameFileEditorTabPath = useCallback((projectId: string, fromPath: string, toPath: string) => {
    setFileEditorState((current) => {
      if (!current) {
        return current;
      }

      let didUpdate = false;
      const nextTabs = current.tabs.map((tab) => {
        if (tab.projectId !== projectId || tab.path !== fromPath) {
          return tab;
        }

        didUpdate = true;
        return {
          ...tab,
          path: toPath
        };
      });

      if (!didUpdate) {
        return current;
      }

      return {
        activePath: current.activePath === fromPath ? toPath : current.activePath,
        tabs: nextTabs
      };
    });
  }, [setFileEditorState]);

  const removeFileEditorTabPath = useCallback((projectId: string, pathName: string) => {
    setFileEditorState((current) => {
      if (!current) {
        return current;
      }

      const nextTabs = current.tabs.filter((tab) => !(tab.projectId === projectId && tab.path === pathName));
      if (nextTabs.length === current.tabs.length) {
        return current;
      }
      if (!nextTabs.length) {
        return null;
      }

      const currentIndex = current.tabs.findIndex((tab) => tab.projectId === projectId && tab.path === pathName);
      const fallbackTab = nextTabs[Math.max(0, Math.min(currentIndex, nextTabs.length - 1))];
      return {
        activePath: current.activePath === pathName ? fallbackTab.path : current.activePath,
        tabs: nextTabs
      };
    });
  }, [setFileEditorState]);

  const handleCreateWorkspaceDirectory = useCallback(async (pathName: string): Promise<void> => {
    if (!snapshot?.project) {
      throw new Error("Choose a project before creating a folder.");
    }

    const projectId = snapshot.project.id;
    const statusId = statusBar.beginStatus("Creating folder", true);
    try {
      await safely(() => noraWorkspaceClient.createWorkspaceDirectory({
        projectId,
        path: pathName,
        rootPath: workspaceFileTree.rootPath || undefined
      }));
    } finally {
      statusBar.endStatus(statusId);
    }
  }, [safely, snapshot?.project, statusBar, workspaceFileTree.rootPath]);

  const handleCreateWorkspaceFile = useCallback(async (pathName: string): Promise<void> => {
    if (!snapshot?.project) {
      throw new Error("Choose a project before creating a file.");
    }

    const projectId = snapshot.project.id;
    const statusId = statusBar.beginStatus("Creating file", true);
    try {
      await safely(() => noraWorkspaceClient.writeWorkspaceFile({
        projectId,
        path: pathName,
        content: "",
        rootPath: workspaceFileTree.rootPath || undefined
      }));
    } finally {
      statusBar.endStatus(statusId);
    }
  }, [safely, snapshot?.project, statusBar, workspaceFileTree.rootPath]);

  const handleRenameWorkspaceFile = useCallback(async (fromPath: string, toPath: string): Promise<void> => {
    if (!snapshot?.project) {
      throw new Error("Choose a project before renaming a file.");
    }

    const projectId = snapshot.project.id;
    const previousFileEditorState = fileEditorState;
    const previousWorkspaceFileTree = workspaceFileTree;
    renameFileEditorTabPath(projectId, fromPath, toPath);
    setWorkspaceFileTree((current) => ({
      ...current,
      paths: current.paths.map((pathName) => (pathName === fromPath ? toPath : pathName))
    }));

    const statusId = statusBar.beginStatus("Renaming file", true);
    try {
      await safely(() => noraWorkspaceClient.moveWorkspaceFile({
        projectId,
        fromPath,
        toPath,
        rootPath: workspaceFileTree.rootPath || undefined
      }));
    } catch (error: unknown) {
      setFileEditorState(previousFileEditorState);
      setWorkspaceFileTree(previousWorkspaceFileTree);
      throw error;
    } finally {
      statusBar.endStatus(statusId);
    }
  }, [
    fileEditorState,
    renameFileEditorTabPath,
    safely,
    setFileEditorState,
    setWorkspaceFileTree,
    snapshot?.project,
    statusBar,
    workspaceFileTree
  ]);

  const handleDeleteWorkspaceFile = useCallback(async (pathName: string): Promise<void> => {
    if (!snapshot?.project) {
      throw new Error("Choose a project before deleting a file.");
    }

    const projectId = snapshot.project.id;
    const previousFileEditorState = fileEditorState;
    const previousWorkspaceFileTree = workspaceFileTree;
    removeFileEditorTabPath(projectId, pathName);
    setWorkspaceFileTree((current) => ({
      ...current,
      paths: current.paths.filter((entry) => entry !== pathName)
    }));

    const statusId = statusBar.beginStatus("Deleting file", true);
    try {
      await safely(() => noraWorkspaceClient.deleteWorkspaceFile({
        projectId,
        path: pathName,
        rootPath: workspaceFileTree.rootPath || undefined
      }));
    } catch (error: unknown) {
      setFileEditorState(previousFileEditorState);
      setWorkspaceFileTree(previousWorkspaceFileTree);
      throw error;
    } finally {
      statusBar.endStatus(statusId);
    }
  }, [
    fileEditorState,
    removeFileEditorTabPath,
    safely,
    setFileEditorState,
    setWorkspaceFileTree,
    snapshot?.project,
    statusBar,
    workspaceFileTree
  ]);

  return {
    handleCreateWorkspaceDirectory,
    handleCreateWorkspaceFile,
    handleRenameWorkspaceFile,
    handleDeleteWorkspaceFile
  };
}
