import { useEffect, useMemo, useState } from "react";
import { threadRequestTarget } from "@/components/app/logic/thread-workspace/requests";
import { summarizeThreadChanges } from "@/components/app/logic/thread-workspace/insights";
import { summarizeThreadSubagents } from "@/components/app/logic/thread-workspace/subagents";
import type { ThreadInsightsInput, ThreadRequestState } from "@/components/app/types/threadInsights.types";

export function useThreadInsights({ header, items, workspace, hasOlderHistory, readBranchRequest }: ThreadInsightsInput) {
  const changes = useMemo(() => summarizeThreadChanges(items, hasOlderHistory), [items, hasOlderHistory]);
  const subagents = useMemo(() => summarizeThreadSubagents(items), [items]);
  const [request, setRequest] = useState<ThreadRequestState>({ status: "unavailable" });
  const [revision, setRevision] = useState(0);
  const target = threadRequestTarget(header?.conversation.workspace, workspace);
  const projectId = target?.projectId;
  const branch = target?.branch;
  const reviewKey = items.filter((item) => item.kind === "review").map((item) => item.id).join("\n");
  useEffect(() => {
    if (!projectId || !branch || !readBranchRequest) {
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
  }, [projectId, branch, readBranchRequest, reviewKey, revision]);
  return { changes, subagents, request, refresh: () => setRevision((current) => current + 1) };
}
