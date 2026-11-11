import { useEffect, useRef } from "react";
import { useWorkspaceSessionPanelActions, useWorkspaceSessionPanelData } from "@/components/app/context/workspaceSessionPanelContext";
import { useWorkspaceView } from "@/components/app/hooks/useWorkspaceView";
import { isWorkspaceNoteMarkdownPath, isWorkspaceSpecMarkdownPath } from "@/components/app/logic/workspaceNoraPaths";
import { FileEditorPanel } from "@/components/app/panels/FileEditorPanel";
import type { WorkspaceEditorProps } from "@/components/app/types/workspaceToolSurfaces.types";

export function WorkspaceEditor({ projectId, active }: WorkspaceEditorProps) {
  const { fileEditorState } = useWorkspaceSessionPanelData();
  const actions = useWorkspaceSessionPanelActions();
  const { view, updateView } = useWorkspaceView(projectId);
  const previousPath = useRef(fileEditorState?.activePath);
  const tabs = (fileEditorState?.tabs ?? []).filter((tab) => tab.projectId === projectId && (isWorkspaceNoteMarkdownPath(tab.path) || isWorkspaceSpecMarkdownPath(tab.path)));
  const selectedPath = view.documentPath;
  const current = tabs.find((tab) => tab.path === fileEditorState?.activePath);
  const selected = tabs.find((tab) => tab.path === selectedPath) ?? current ?? tabs.at(-1);
  const select = (path: string) => {
    updateView({ documentPath: path });
    actions.onFocusFileEditorTab(path);
  };
  useEffect(() => {
    const changed = previousPath.current !== fileEditorState?.activePath;
    previousPath.current = fileEditorState?.activePath;
    if (active && changed && current && current.path !== selectedPath) {
      updateView({ documentPath: current.path });
    }
  }, [active, current?.path, fileEditorState?.activePath, selectedPath, updateView]);
  if (!selected) return <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">Open a note or spec to read and edit it here.</div>;
  return <FileEditorPanel tabs={tabs} activePath={selected.path} title="Document"
    onSelectTab={select} onChange={(content) => actions.onChangeFileEditorTabContent(selected.path, content)}
    onSave={() => actions.onSaveFileEditorTab(selected.path)} onRevert={() => actions.onRevertFileEditorTab(selected.path)}
    onClose={() => actions.onCloseFileEditorTab(selected.path)} onCloseTab={actions.onCloseFileEditorTab}
    onOpenFileEditor={async (path, options) => { await actions.onOpenFileEditor(path, options); select(path); }}
    onGenerateTasks={isWorkspaceSpecMarkdownPath(selected.path) ? () => actions.onGenerateTasksFromSpec(projectId, selected.path) : null} />;
}
