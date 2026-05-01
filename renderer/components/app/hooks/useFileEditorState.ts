import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { normalizeSnapshot } from "@/components/app/logic/appUtils";
import type { FileEditorState, FileEditorTab } from "@/components/app/types";
import type { UseFileEditorStateArgs, UseFileEditorStateResult } from "@/components/app/types/component.types";
import type { OpenWorkspaceFileEditorOptions } from "@/components/app/types/workflow.types";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useEffect, useState } from "react";

function isImageFilePath(pathName: string): boolean {
  const normalized = pathName.toLowerCase();
  return (
    normalized.endsWith(".png") ||
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg") ||
    normalized.endsWith(".gif") ||
    normalized.endsWith(".webp") ||
    normalized.endsWith(".bmp") ||
    normalized.endsWith(".svg")
  );
}

export function useFileEditorState({
  safely,
  setUiState,
  onOpenEditor,
  onAfterWorkspaceFileSaved
}: UseFileEditorStateArgs): UseFileEditorStateResult {
  const snapshot = useCanonicalAppSnapshot();
  const [fileEditorState, setFileEditorState] = useState<FileEditorState | null>(null);

  useEffect(() => {
    const currentProjectId = snapshot?.project?.id || null;
    setFileEditorState((current) => {
      if (!current) {
        return current;
      }
      if (!currentProjectId || current.tabs.some((tab) => tab.projectId !== currentProjectId)) {
        return null;
      }
      return current;
    });
  }, [snapshot?.project?.id]);

  const upsertFileEditorTab = (tab: FileEditorTab) => {
    setFileEditorState((current) => {
      const existingTabs = current?.tabs || [];
      const nextTabs = existingTabs.some((entry) => entry.path === tab.path)
        ? existingTabs.map((entry) => entry.path === tab.path ? tab : entry)
        : [...existingTabs, tab];
      return {
        activePath: tab.path,
        tabs: nextTabs
      };
    });
  };

  const openFileEditor = async (pathName: string, options?: OpenWorkspaceFileEditorOptions): Promise<void> => {
    if (!snapshot?.project) {
      return;
    }

    if (options?.prefetchedContent !== undefined) {
      if (options.selectChange !== false) {
        void safely(() => noraWorkspaceClient.selectChange(pathName));
      }
      onOpenEditor();
      upsertFileEditorTab({
        projectId: snapshot.project.id,
        path: pathName,
        rootPath: options.rootPath ?? snapshot.changesRoot ?? snapshot.project.rootPath,
        kind: "text",
        content: options.prefetchedContent,
        savedContent: options.prefetchedContent,
        imageDataUrl: null,
        imageMimeType: null,
        isLoading: false,
        isSaving: false,
        errorMessage: null,
        isReadOnly: options.isReadOnly === true
      });
      return;
    }

    if (options?.selectChange !== false) {
      void safely(() => noraWorkspaceClient.selectChange(pathName));
    }
    onOpenEditor();

    const baseTab: FileEditorTab = {
      projectId: snapshot.project.id,
      path: pathName,
      rootPath: options?.rootPath ?? snapshot.changesRoot ?? snapshot.project.rootPath,
      kind: isImageFilePath(pathName) ? "image" : "text",
      content: "",
      savedContent: "",
      imageDataUrl: null,
      imageMimeType: null,
      isLoading: true,
      isSaving: false,
      errorMessage: null
    };
    upsertFileEditorTab(baseTab);

    try {
      if (baseTab.kind === "image") {
        const image = await noraWorkspaceClient.readWorkspaceImageFile({
          projectId: snapshot.project.id,
          path: pathName,
          rootPath: baseTab.rootPath || undefined
        });
        upsertFileEditorTab({
          ...baseTab,
          imageDataUrl: image.dataUrl,
          imageMimeType: image.mimeType,
          isLoading: false,
          errorMessage: null
        });
      } else {
        const content = await noraWorkspaceClient.readWorkspaceFile({
          projectId: snapshot.project.id,
          path: pathName,
          rootPath: baseTab.rootPath || undefined
        });
        upsertFileEditorTab({
          ...baseTab,
          content,
          savedContent: content,
          isLoading: false,
          errorMessage: null
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to open file.";
      upsertFileEditorTab({
        ...baseTab,
        isLoading: false,
        errorMessage: message
      });
    }
  };

  const saveFileEditor = async (): Promise<void> => {
    const activeTab = fileEditorState?.tabs.find((tab) => tab.path === fileEditorState.activePath) ?? null;
    if (
      !fileEditorState ||
      !activeTab ||
      activeTab.kind !== "text" ||
      activeTab.isReadOnly === true ||
      activeTab.isLoading ||
      activeTab.isSaving
    ) {
      return;
    }

    setFileEditorState((current) =>
      current
        ? {
            ...current,
            tabs: current.tabs.map((tab) =>
              tab.path === current.activePath
                ? { ...tab, isSaving: true, errorMessage: null }
                : tab
            )
          }
        : current
    );
    try {
      const next = normalizeSnapshot(await noraWorkspaceClient.writeWorkspaceFile({
        projectId: activeTab.projectId,
        path: activeTab.path,
        rootPath: activeTab.rootPath || undefined,
        content: activeTab.content
      }));
      setUiState((current) => ({
        ...current,
        activeErrorMessage: next.errorMessage || current.activeErrorMessage,
        snapshot: next
      }));
      setFileEditorState((current) =>
        current
          ? {
              ...current,
              tabs: current.tabs.map((tab) =>
                tab.path === activeTab.path
                  ? {
                      ...tab,
                      savedContent: tab.content,
                      isSaving: false,
                      errorMessage: null
                    }
                  : tab
              )
            }
          : current
      );
      onAfterWorkspaceFileSaved?.({
        projectId: activeTab.projectId,
        path: activeTab.path
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to save file.";
      setFileEditorState((current) =>
        current
          ? {
              ...current,
              tabs: current.tabs.map((tab) =>
                tab.path === activeTab.path
                  ? {
                      ...tab,
                      isSaving: false,
                      errorMessage: message
                    }
                  : tab
              )
            }
          : current
      );
    }
  };

  return {
    fileEditorState,
    setFileEditorState,
    openFileEditor,
    saveFileEditor
  };
}
