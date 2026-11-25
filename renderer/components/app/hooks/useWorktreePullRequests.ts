import { startVisiblePolling } from "@/components/app/logic/visiblePolling";
import { useEffect, useState } from "react";
import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import { useWorkspaceSidebarRuntime } from "@/components/app/context/workspaceSidebarContext";
import type { ForgeBranchPullRequestStatus, WorkspaceSummary } from "@shared/appTypes";

export function useWorktreePullRequests(workspace: WorkspaceSummary) {
  const { githubToken, gitlabToken, gitlabHost } = useWorkspaceSidebarRuntime();
  const [statuses, setStatuses] = useState<Record<string, ForgeBranchPullRequestStatus | null>>({});
  const branchesKey = JSON.stringify([...new Set(workspace.worktrees.map((entry) => entry.branch.trim()).filter(Boolean))].sort());
  const projectId = workspace.project.id;
  useEffect(() => {
    let cancelled = false;
    const branches: string[] = JSON.parse(branchesKey);
    if (!branches.length) { setStatuses({}); return; }
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      const entries = await Promise.all(branches.map(async (branch) => {
        try {
          return [`${projectId}:${branch}`, await noraIntegrationClient.getForgeBranchPullRequestStatus(projectId, branch, { githubToken, gitlabToken, gitlabHost })] as const;
        } catch { return [`${projectId}:${branch}`, null] as const; }
      }));
      loading = false;
      if (!cancelled) setStatuses(Object.fromEntries(entries));
    };
    const stop = startVisiblePolling(() => void load(), 30000);
    return () => { cancelled = true; stop(); };
  }, [branchesKey, projectId, githubToken, gitlabToken, gitlabHost]);
  return statuses;
}
