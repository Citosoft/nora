import { useEffect, useState } from "react";
import { threadRequestTargets } from "@/components/app/logic/thread-workspace/requests";
import type { ThreadWorkspaceSnapshot } from "@/components/app/types/thread-workspace/state.types";
import type { ThreadRequestResults, ThreadRequestTarget } from "@/components/app/types/threadRequests.types";
import type { BranchRequestReader } from "@/components/app/types/threadInsights.types";

export function useThreadPullRequests(state: ThreadWorkspaceSnapshot, conversationIds: readonly string[], readBranchRequest: BranchRequestReader | null) {
  const key = JSON.stringify(threadRequestTargets(state, conversationIds));
  const [results, setResults] = useState<ThreadRequestResults>({ key: "", requests: {} });
  useEffect(() => {
    if (!readBranchRequest) return;
    const targets: ThreadRequestTarget[] = JSON.parse(key);
    if (!targets.length) return;
    let cancelled = false, loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      const groups = await Promise.all(targets.map(async (target) => {
        const request = await readBranchRequest(target.projectId, target.branch).catch(() => null);
        return target.conversationIds.map((id) => [id, request] as const);
      }));
      loading = false;
      if (!cancelled) setResults({ key, requests: Object.fromEntries(groups.flat()) });
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    window.addEventListener("focus", load);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [key, readBranchRequest]);
  return readBranchRequest && results.key === key ? results.requests : {};
}
