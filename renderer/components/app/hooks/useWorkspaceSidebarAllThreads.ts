import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { buildAllThreadsGroupSections } from "@/components/app/logic/allWorkspaceThreadsGroup";
import type {
  AllThreadsGroupBy,
  AllWorkspaceThreadListEntry
} from "@/components/app/types/workspaceSidebarAllThreads.types";
import type { ExternalHarnessSessionSummary, WorkspaceSummary } from "@shared/appTypes";
import { useEffect, useMemo, useState } from "react";

type WorkspaceThreadLoadResult = {
  workspace: WorkspaceSummary;
  sessions: ExternalHarnessSessionSummary[];
};

export function useWorkspaceSidebarAllThreads({
  workspaceGroups,
  reloadToken
}: {
  workspaceGroups: WorkspaceSummary[];
  reloadToken: number;
}) {
  const [isAllThreadsSectionCollapsed, setIsAllThreadsSectionCollapsed] = useState(false);
  const [allThreadsWorkspaceFilter, setAllThreadsWorkspaceFilter] = useState("all");
  const [allThreadsHarnessFilter, setAllThreadsHarnessFilter] = useState("all");
  const [allThreadsGroupBy, setAllThreadsGroupBy] = useState<AllThreadsGroupBy>("workspace");
  const [workspaceThreadResults, setWorkspaceThreadResults] = useState<WorkspaceThreadLoadResult[]>([]);
  const [isLoadingAllThreads, setIsLoadingAllThreads] = useState(false);

  const workspaceLoadKey = useMemo(
    () => workspaceGroups.map((workspace) => `${workspace.project.id}:${workspace.project.rootPath}`).sort().join("|"),
    [workspaceGroups]
  );

  useEffect(() => {
    if (!workspaceGroups.length) {
      setWorkspaceThreadResults([]);
      setIsLoadingAllThreads(false);
      return;
    }

    let cancelled = false;
    setIsLoadingAllThreads(true);
    void Promise.all(
      workspaceGroups.map(async (workspace): Promise<WorkspaceThreadLoadResult> => {
        try {
          const sessions = await noraWorkspaceClient.listExternalHarnessContextSessions(
            workspace.project.id,
            workspace.project.rootPath
          );
          return { workspace, sessions };
        } catch {
          return { workspace, sessions: [] };
        }
      })
    ).then((results) => {
      if (cancelled) {
        return;
      }
      setWorkspaceThreadResults(results);
      setIsLoadingAllThreads(false);
    });

    return () => {
      cancelled = true;
    };
  }, [reloadToken, workspaceLoadKey]);

  const allWorkspaceThreadEntries = useMemo((): AllWorkspaceThreadListEntry[] => {
    return workspaceThreadResults.flatMap(({ workspace, sessions }) =>
      sessions.map((thread) => ({
        workspaceId: workspace.project.id,
        workspaceName: workspace.project.name,
        workspaceRootPath: workspace.project.rootPath,
        thread
      }))
    );
  }, [workspaceThreadResults]);

  const allThreadsWorkspaceFilterOptions = useMemo(
    () => [
      { value: "all", label: "All projects" },
      ...workspaceGroups.map((workspace) => ({
        value: workspace.project.id,
        label: workspace.project.name
      }))
    ],
    [workspaceGroups]
  );

  const allThreadsHarnessFilterOptions = useMemo(() => {
    const byToolId = new Map<string, string>();
    for (const entry of allWorkspaceThreadEntries) {
      byToolId.set(entry.thread.toolId, entry.thread.toolLabel);
    }
    return [
      { value: "all", label: "All harnesses" },
      ...[...byToolId.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((left, right) => left.label.localeCompare(right.label))
    ];
  }, [allWorkspaceThreadEntries]);

  const filteredAllWorkspaceThreadEntries = useMemo(
    () =>
      allWorkspaceThreadEntries.filter((entry) => {
        if (allThreadsWorkspaceFilter !== "all" && entry.workspaceId !== allThreadsWorkspaceFilter) {
          return false;
        }
        if (allThreadsHarnessFilter !== "all" && entry.thread.toolId !== allThreadsHarnessFilter) {
          return false;
        }
        return true;
      }),
    [allThreadsHarnessFilter, allThreadsWorkspaceFilter, allWorkspaceThreadEntries]
  );

  const allThreadsGroupSections = useMemo(
    () => buildAllThreadsGroupSections(filteredAllWorkspaceThreadEntries, allThreadsGroupBy),
    [allThreadsGroupBy, filteredAllWorkspaceThreadEntries]
  );

  return {
    allThreadsGroupBy,
    allThreadsGroupSections,
    allThreadsHarnessFilter,
    allThreadsHarnessFilterOptions,
    allThreadsWorkspaceFilter,
    allThreadsWorkspaceFilterOptions,
    filteredAllWorkspaceThreadEntries,
    isAllThreadsSectionCollapsed,
    isLoadingAllThreads,
    setAllThreadsGroupBy,
    setAllThreadsHarnessFilter,
    setAllThreadsWorkspaceFilter,
    setIsAllThreadsSectionCollapsed
  };
}
