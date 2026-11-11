import { useMemo } from "react";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { buildWorkspaceGroups } from "@/components/app/logic/workspaceGroups";
import { SessionTabPane } from "@/components/app/panels/SessionTabStack";
import { WorkspaceToolContent } from "./WorkspaceToolContent";

export function WorkspaceToolPanes() {
  const snapshot = useCanonicalAppSnapshot();
  const { route, openedTools } = useWorkspaceNavigation();
  const workspaces = useMemo(() => new Map(buildWorkspaceGroups(snapshot, new Set()).map((workspace) => [workspace.project.id, workspace])), [snapshot]);
  return <>{openedTools.map((entry) => {
    const workspace = workspaces.get(entry.projectId);
    if (!workspace || entry.tool === "files" || entry.tool === "changes") return null;
    const active = route?.projectId === entry.projectId && route.tool === entry.tool;
    return <SessionTabPane key={`${entry.projectId}:${entry.tool}`} visible={active}>
      <WorkspaceToolContent tool={entry.tool} workspace={workspace} active={active} />
    </SessionTabPane>;
  })}</>;
}
