import { useEffect, useMemo, useState } from "react";
import { summarizeThreadChanges } from "@/components/app/logic/thread-workspace/insights";
import type { ThreadInsightsInput, ThreadRequestState } from "@/components/app/types/threadInsights.types";

export function useThreadInsights({ header, items, workspace, hasOlderHistory, readBranchRequest }: ThreadInsightsInput) {
  const changes = useMemo(() => summarizeThreadChanges(items, hasOlderHistory), [items, hasOlderHistory]);
  const [request, setRequest] = useState<ThreadRequestState>({ status: "unavailable" });
  const [revision, setRevision] = useState(0);
  const target = header?.conversation.workspace;
  const projectId = workspace.shellProjectId;
  const branch = target?.branch;
  const matchesWorkspace = target?.environmentId === workspace.workspace.environmentId
    && target?.projectId === workspace.workspace.projectId && target?.path === workspace.workspace.path;
  const reviewKey = items.filter((item) => item.kind === "review").map((item) => item.id).join("\n");
  useEffect(() => {
    if (!projectId || !branch || !matchesWorkspace || !readBranchRequest || target?.versionControl === "none") {
      setRequest({ status: "unavailable" });
      return;
    }
    let cancelled = false;
    setRequest({ status: "loading" });
    void readBranchRequest(projectId, branch).then((value) => {
      if (!cancelled) setRequest({ status: "ready", request: value });
    }).catch((cause: unknown) => {
      if (!cancelled) setRequest({ status: "failed", message: cause instanceof Error ? cause.message : "Change request could not be loaded." });
    });
    return () => { cancelled = true; };
  }, [projectId, branch, matchesWorkspace, readBranchRequest, target?.versionControl, reviewKey, revision]);
  return { changes, request, refresh: () => setRevision((current) => current + 1) };
}
