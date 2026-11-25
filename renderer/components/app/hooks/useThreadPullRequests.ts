import { startVisiblePolling } from "@/components/app/logic/visiblePolling";
import { useEffect, useMemo, useState } from "react";
import { threadRequestTargets } from "@/components/app/logic/thread-workspace/requests";
import type { ThreadWorkspaceSnapshot } from "@/components/app/types/thread-workspace/state.types";
import type { ThreadRequestResults, ThreadRequestTarget } from "@/components/app/types/threadRequests.types";
import type { ThreadForgeClient } from "@/components/app/types/threadForge.types";

export function useThreadPullRequests(state: ThreadWorkspaceSnapshot, conversationIds: readonly string[], forge: ThreadForgeClient | null) {
  const key = useMemo(() => forge ? JSON.stringify(threadRequestTargets(state, conversationIds)) : "", [forge, state, conversationIds]);
  const [results, setResults] = useState<ThreadRequestResults>({ key: "", requests: {} });
  useEffect(() => {
    if (!forge) return;
    const targets: ThreadRequestTarget[] = JSON.parse(key);
    if (!targets.length) return;
    let cancelled = false, loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      const groups = await Promise.all(targets.map(async (target) => {
        const request = await forge.readBranchRequest(target.projectId, target.branch).catch(() => null);
        return target.conversationIds.map((id) => [id, request] as const);
      }));
      loading = false;
      if (!cancelled) setResults({ key, requests: Object.fromEntries(groups.flat()) });
    };
    const stop = startVisiblePolling(() => void load(), 30_000);
    window.addEventListener("focus", load);
    return () => { cancelled = true; stop(); window.removeEventListener("focus", load); };
  }, [key, forge]);
  return forge && results.key === key ? results.requests : {};
}
