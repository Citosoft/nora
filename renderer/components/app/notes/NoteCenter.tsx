import { useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { NoteBrowserPanel } from "@/components/app/panels/NoteBrowserPanel";

export function NoteCenter() {
  const snapshot = useCanonicalAppSnapshot();
  const { noteCenterProps } = useAppMainCenterContent();
  const {
    workspaceNotes,
    isCreatingNote,
    onOpenNote,
    onCreateNote,
    onDeleteNote,
    onClose
  } = noteCenterProps;

  if (!snapshot) {
    return null;
  }

  const workspaces = [
    ...(snapshot.project
      ? [{
          projectId: snapshot.project.id,
          projectName: snapshot.project.name,
          projectRootPath: snapshot.project.rootPath
        }]
      : []),
    ...snapshot.workspaces
      .filter((workspace) => workspace.project.id !== snapshot.project?.id)
      .map((workspace) => ({
        projectId: workspace.project.id,
        projectName: workspace.project.name,
        projectRootPath: workspace.project.rootPath
      }))
  ].map((workspace) => ({
    ...workspace,
    notes: workspaceNotes[workspace.projectId]?.notes ?? [],
    isLoading: workspaceNotes[workspace.projectId]?.isLoading ?? false,
    errorMessage: workspaceNotes[workspace.projectId]?.errorMessage ?? null
  }));

  return (
    <NoteBrowserPanel
      workspaces={workspaces}
      isCreatingNote={isCreatingNote}
      onOpenNote={onOpenNote}
      onCreateNote={onCreateNote}
      onDeleteNote={onDeleteNote}
      onClose={onClose}
    />
  );
}
