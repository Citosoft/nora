import { useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { SpecBrowserPanel } from "@/components/app/panels/SpecBrowserPanel";

export function SpecCenter() {
  const snapshot = useCanonicalAppSnapshot();
  const { specCenterProps } = useAppMainCenterContent();
  const {
    projectId,
    workspaceSpecs,
    isCreatingSpec,
    onOpenSpec,
    onCreateSpec,
    onDeleteSpec,
    onGenerateTasksFromSpec,
    onClose
  } = specCenterProps;

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
  ].filter((workspace) => !projectId || workspace.projectId === projectId).map((workspace) => ({
    ...workspace,
    specs: workspaceSpecs[workspace.projectId]?.specs ?? [],
    isLoading: workspaceSpecs[workspace.projectId]?.isLoading ?? false,
    errorMessage: workspaceSpecs[workspace.projectId]?.errorMessage ?? null
  }));

  return (
    <SpecBrowserPanel
      workspaces={workspaces}
      isCreatingSpec={isCreatingSpec}
      onOpenSpec={onOpenSpec}
      onCreateSpec={onCreateSpec}
      onDeleteSpec={onDeleteSpec}
      onGenerateTasksFromSpec={onGenerateTasksFromSpec}
      onClose={onClose}
    />
  );
}
