import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import { buildAllAgentsGroupSections } from "@/components/app/logic/allWorkspaceAgentsGroup";
import type { AllAgentsGroupBy, AllAgentsPrFilter, AllWorkspaceAgentListEntry } from "@/components/app/types/workspaceSidebarAllAgents.types";
import type { ForgeBranchPullRequestStatus, WorkspaceSummary } from "@shared/appTypes";
import { useEffect, useMemo, useRef, useState } from "react";

function hasPullRequestState(state: ForgeBranchPullRequestStatus["state"] | null | undefined): boolean {
  return state === "open" || state === "draft" || state === "closed" || state === "merged";
}

function buildStatusSignature(status: ForgeBranchPullRequestStatus | null): string {
  if (!status) {
    return "null";
  }

  return [
    status.branch,
    status.branchExistsOnRemote ? "1" : "0",
    status.state,
    status.label,
    status.pullRequestNumber ?? "",
    status.webUrl ?? ""
  ].join("|");
}

function areStatusMapsEqual(
  current: Record<string, ForgeBranchPullRequestStatus | null>,
  next: Record<string, ForgeBranchPullRequestStatus | null>
): boolean {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  if (currentKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of currentKeys) {
    if (!(key in next)) {
      return false;
    }
    if (buildStatusSignature(current[key] ?? null) !== buildStatusSignature(next[key] ?? null)) {
      return false;
    }
  }

  return true;
}

export function useWorkspaceSidebarAllAgents({
  workspaceGroups,
  githubToken,
  gitlabToken,
  gitlabHost
}: {
  workspaceGroups: WorkspaceSummary[];
  githubToken: string;
  gitlabToken: string;
  gitlabHost: string;
}) {
  const [isAllAgentsSectionCollapsed, setIsAllAgentsSectionCollapsed] = useState(false);
  const [allAgentsWorkspaceFilter, setAllAgentsWorkspaceFilter] = useState("all");
  const [allAgentsPrFilter, setAllAgentsPrFilter] = useState<AllAgentsPrFilter>("all");
  const [allAgentsGroupBy, setAllAgentsGroupBy] = useState<AllAgentsGroupBy>("workspace");
  const [pullRequestStatusByWorkspaceBranch, setPullRequestStatusByWorkspaceBranch] = useState<
    Record<string, ForgeBranchPullRequestStatus | null>
  >({});

  const workspaceAgentBranchTargets = useMemo(
    () =>
      workspaceGroups.flatMap((workspace) =>
        workspace.agents
          .map((agent) => ({
            projectId: workspace.project.id,
            branch: agent.branch.trim()
          }))
          .filter((entry) => entry.branch.length > 0)
      ),
    [workspaceGroups]
  );
  const workspaceAgentBranchTargetsKey = useMemo(
    () =>
      workspaceAgentBranchTargets
        .map((entry) => `${entry.projectId}:${entry.branch}`)
        .sort()
        .join("|"),
    [workspaceAgentBranchTargets]
  );
  const workspaceAgentBranchTargetsRef = useRef(workspaceAgentBranchTargets);

  useEffect(() => {
    workspaceAgentBranchTargetsRef.current = workspaceAgentBranchTargets;
  }, [workspaceAgentBranchTargets]);

  const allWorkspaceAgentEntries = useMemo((): AllWorkspaceAgentListEntry[] => {
    return workspaceGroups.flatMap((workspace) =>
      workspace.agents.map((agent) => {
        const pullRequestStatus = pullRequestStatusByWorkspaceBranch[`${workspace.project.id}:${agent.branch.trim()}`] ?? null;
        return {
          workspaceId: workspace.project.id,
          workspaceName: workspace.project.name,
          agent,
          pullRequestStatus
        };
      })
    );
  }, [pullRequestStatusByWorkspaceBranch, workspaceGroups]);

  const allAgentsWorkspaceFilterOptions = useMemo(
    () => [
      { value: "all", label: "All workspaces" },
      ...workspaceGroups.map((workspace) => ({
        value: workspace.project.id,
        label: workspace.project.name
      }))
    ],
    [workspaceGroups]
  );

  const filteredAllWorkspaceAgentEntries = useMemo(() => {
    const matchesPrFilter = (status: ForgeBranchPullRequestStatus | null): boolean => {
      if (allAgentsPrFilter === "all") {
        return true;
      }
      if (allAgentsPrFilter === "with_pr") {
        return hasPullRequestState(status?.state);
      }
      if (allAgentsPrFilter === "none") {
        return !hasPullRequestState(status?.state);
      }
      return status?.state === allAgentsPrFilter;
    };

    return allWorkspaceAgentEntries.filter((entry) => {
      if (allAgentsWorkspaceFilter !== "all" && entry.workspaceId !== allAgentsWorkspaceFilter) {
        return false;
      }
      return matchesPrFilter(entry.pullRequestStatus);
    });
  }, [allAgentsPrFilter, allAgentsWorkspaceFilter, allWorkspaceAgentEntries]);

  const allAgentsGroupSections = useMemo(
    () => buildAllAgentsGroupSections(filteredAllWorkspaceAgentEntries, allAgentsGroupBy),
    [allAgentsGroupBy, filteredAllWorkspaceAgentEntries]
  );

  useEffect(() => {
    if (!workspaceAgentBranchTargetsKey) {
      setPullRequestStatusByWorkspaceBranch((current) =>
        Object.keys(current).length === 0 ? current : {}
      );
      return;
    }

    const uniqueBranchTargets = Array.from(
      new Map(
        workspaceAgentBranchTargetsRef.current.map((entry) => [`${entry.projectId}:${entry.branch}`, entry] as const)
      ).values()
    );
    const nextStatuses: Record<string, ForgeBranchPullRequestStatus | null> = {};
    let mounted = true;

    void Promise.all(uniqueBranchTargets.map(async (entry) => {
      try {
        const status = await noraIntegrationClient.getForgeBranchPullRequestStatus(entry.projectId, entry.branch, {
          githubToken,
          gitlabToken,
          gitlabHost
        });
        nextStatuses[`${entry.projectId}:${entry.branch}`] = status;
      } catch {
        nextStatuses[`${entry.projectId}:${entry.branch}`] = null;
      }
    })).then(() => {
      if (!mounted) {
        return;
      }
      setPullRequestStatusByWorkspaceBranch((current) =>
        areStatusMapsEqual(current, nextStatuses) ? current : nextStatuses
      );
    });

    return () => {
      mounted = false;
    };
  }, [githubToken, gitlabHost, gitlabToken, workspaceAgentBranchTargetsKey]);

  return {
    allAgentsGroupBy,
    allAgentsGroupSections,
    allAgentsPrFilter,
    allAgentsWorkspaceFilter,
    allAgentsWorkspaceFilterOptions,
    filteredAllWorkspaceAgentEntries,
    isAllAgentsSectionCollapsed,
    pullRequestStatusByWorkspaceBranch,
    setAllAgentsGroupBy,
    setAllAgentsPrFilter,
    setAllAgentsWorkspaceFilter,
    setIsAllAgentsSectionCollapsed
  };
}
