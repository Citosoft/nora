import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { ChangesPanelProvider } from "@/components/app/context/changesPanelContext";
import { useWorkspaceRuntime } from "@/components/app/context/workspaceRuntimeContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { ChangesPanel as AppChangesPanel } from "@/components/app/panels/ChangesPanel";
import type { ChangesPanelProps, ChangesPanelSectionProps } from "@/components/app/types/changesPanel.types";
import { useMemo } from "react";

export const ChangesPanelSection = ({ forge, vercel, chrome, fileHandlers, openCreateAgentDialog }: ChangesPanelSectionProps) => {
  const snapshot = useCanonicalAppSnapshot();
  const { workspaceFileTree, fileChangeCounts, safely } = useWorkspaceRuntime();

  const changesPanelValue = useMemo<ChangesPanelProps>(
    () => ({
      workspace: {
        tools: snapshot?.agentCatalog ?? [],
        onOpenCreateAgentDialog: openCreateAgentDialog
      },
      files: {
        paths: workspaceFileTree.paths,
        directoryPaths: workspaceFileTree.directoryPaths,
        changeCounts: fileChangeCounts,
        loading: workspaceFileTree.isLoading,
        errorMessage: workspaceFileTree.errorMessage,
        onOpenFile: (pathName, options) => {
          void fileHandlers.openFileEditor(pathName, {
            selectChange: false,
            rootPath: workspaceFileTree.rootPath,
            ...options
          });
        },
        onCreateFile: fileHandlers.onCreateFile,
        onCreateDirectory: fileHandlers.onCreateDirectory,
        onImportImageToDirectory: async (directoryPath, payload) => {
          const projectId = snapshot?.project?.id;
          if (!projectId) {
            throw new Error("Choose a project before importing an image.");
          }
          console.log("[nora renderer] importBrowserImageToWorkspace requested", {
            projectId,
            rootPath: workspaceFileTree.rootPath || undefined,
            directoryPath,
            payload
          });
          await safely(() =>
            noraWorkspaceClient.importBrowserImageToWorkspace({
              projectId,
              rootPath: workspaceFileTree.rootPath || undefined,
              directoryPath,
              sourceUrl: payload.sourceUrl,
              data: payload.data,
              mimeType: payload.mimeType,
              suggestedFileName: payload.suggestedFileName
            })
          );
        },
        onRenameFile: fileHandlers.onRenameFile,
        onDeleteFile: fileHandlers.onDeleteFile
      },
      forge,
      vercel,
      chrome,
      openCreateAgentDialog
    }),
    [
      snapshot,
      workspaceFileTree.paths,
      workspaceFileTree.directoryPaths,
      workspaceFileTree.isLoading,
      workspaceFileTree.errorMessage,
      workspaceFileTree.rootPath,
      fileChangeCounts,
      safely,
      fileHandlers,
      forge,
      vercel,
      chrome
    ]
  );

  return (
    <ChangesPanelProvider value={changesPanelValue}>
      <AppChangesPanel />
    </ChangesPanelProvider>
  );
};
