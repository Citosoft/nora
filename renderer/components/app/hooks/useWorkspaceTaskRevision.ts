import { useEffect, useState } from "react";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";

/** Task tools change Nora state outside Git, including in background workspaces. */
export function useWorkspaceTaskRevision(): number {
  const snapshot = useCanonicalAppSnapshot();
  const [revision, setRevision] = useState(0);
  const activeProjectId = snapshot?.project?.id;
  const workspaces = snapshot?.workspaces;
  useEffect(() => noraWorkspaceClient.onWorkspaceTasksChanged((projectId) => {
    if (projectId === activeProjectId || workspaces?.some((entry) => entry.project.id === projectId)) {
      setRevision((current) => current + 1);
    }
  }), [activeProjectId, workspaces]);
  return revision;
}
