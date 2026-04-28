import type {
  UseAppRootFileEditorActiveTabSyncEffectArgs,
  UseAppRootFileEditorWorkspaceRestoreEffectsArgs
} from "@/components/app/types/useAppRootFileEditorWorkspaceRestoreEffects.types";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useEffect } from "react";

export const useAppRootFileEditorWorkspaceRestoreEffects = ({
  workspaceContentRestoredRef,
  storedWorkspaceContentState,
  openFileEditor,
  setFileEditorState,
  setIsCenterDiffExpanded,
  setActiveWorkspaceContentTab
}: UseAppRootFileEditorWorkspaceRestoreEffectsArgs): void => {
  const snapshot = useCanonicalAppSnapshot();
  useEffect(() => {
    if (!snapshot?.project || workspaceContentRestoredRef.current) {
      return;
    }

    workspaceContentRestoredRef.current = true;
    const storedFileEditor = storedWorkspaceContentState.fileEditor;
    if (!storedFileEditor?.tabs.length) {
      return;
    }

    const normalizePath = (value: string | null | undefined): string =>
      (value || "").replace(/\\/g, "/").toLowerCase();
    const currentProjectRoot = normalizePath(snapshot.project.rootPath);
    const currentChangesRoot = normalizePath(snapshot.changesRoot ?? null);

    let tabsForProject = storedFileEditor.tabs.filter((tab) => tab.projectId === snapshot.project?.id);
    if (!tabsForProject.length) {
      tabsForProject = storedFileEditor.tabs.filter((tab) => {
        const tabRoot = normalizePath(tab.rootPath);
        return Boolean(tabRoot) && (tabRoot === currentProjectRoot || tabRoot === currentChangesRoot);
      });
    }
    if (!tabsForProject.length && storedFileEditor.tabs.length === 1) {
      tabsForProject = storedFileEditor.tabs;
    }
    if (!tabsForProject.length) {
      return;
    }

    const orderedPaths = Array.from(
      new Set([
        ...tabsForProject
          .filter((tab) => tab.path !== storedFileEditor.activePath)
          .map((tab) => tab.path),
        ...(storedFileEditor.activePath && tabsForProject.some((tab) => tab.path === storedFileEditor.activePath)
          ? [storedFileEditor.activePath]
          : [])
      ])
    );

    setIsCenterDiffExpanded(false);
    setActiveWorkspaceContentTab("file");
    void (async () => {
      for (const pathName of orderedPaths) {
        const storedTab = tabsForProject.find((tab) => tab.path === pathName) ?? null;
        await openFileEditor(pathName, {
          selectChange: false,
          rootPath: storedTab?.rootPath ?? snapshot.project?.rootPath ?? null
        });
      }

      const storedActivePath = storedFileEditor.activePath;
      if (!storedActivePath) {
        return;
      }

      setFileEditorState((current) =>
        current && current.tabs.some((tab) => tab.path === storedActivePath)
          ? {
              ...current,
              activePath: storedActivePath
            }
          : current
      );
    })();
  }, [
    openFileEditor,
    setActiveWorkspaceContentTab,
    setFileEditorState,
    setIsCenterDiffExpanded,
    snapshot?.project,
    storedWorkspaceContentState.fileEditor
  ]);
};

export const useAppRootFileEditorActiveTabSyncEffect = ({
  fileEditorState,
  isCenterDiffExpanded,
  setActiveWorkspaceContentTab
}: UseAppRootFileEditorActiveTabSyncEffectArgs): void => {
  useEffect(() => {
    setActiveWorkspaceContentTab((current) => {
      if (current === "file" && !fileEditorState?.tabs.length) {
        return isCenterDiffExpanded ? "diff" : null;
      }
      if (current === "diff" && !isCenterDiffExpanded) {
        return fileEditorState?.tabs.length ? "file" : null;
      }
      if (current === null) {
        if (isCenterDiffExpanded) {
          return "diff";
        }
        if (fileEditorState?.tabs.length) {
          return "file";
        }
      }
      return current;
    });
  }, [fileEditorState?.tabs.length, isCenterDiffExpanded, setActiveWorkspaceContentTab]);
};
