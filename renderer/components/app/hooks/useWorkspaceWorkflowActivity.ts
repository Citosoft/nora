import { useEffect, useState } from "react";
import { noraLoopClient } from "@/components/app/clients/noraLoopClient";
import type { LoopRun } from "@shared/appTypes";

export function useWorkspaceWorkflowActivity(projectIds: readonly string[]) {
  const [runs, setRuns] = useState<LoopRun[]>([]);
  const projectIdsKey = JSON.stringify([...projectIds].sort());
  useEffect(() => {
    let cancelled = false;
    const ids: string[] = JSON.parse(projectIdsKey);
    const liveRuns = new Map<string, LoopRun>();
    setRuns([]);
    const unsubscribe = noraLoopClient.onLoopRunChanged((run) => {
      if (!ids.includes(run.projectId)) return;
      liveRuns.set(run.id, run);
      setRuns((current) => [...current.filter((entry) => entry.id !== run.id), run]);
    });
    void Promise.all(ids.map((id) => noraLoopClient.listLoopRuns(id).catch(() => []))).then((groups) => {
      if (!cancelled) {
        const merged = new Map(groups.flat().map((run) => [run.id, run]));
        for (const [id, run] of liveRuns) merged.set(id, run);
        setRuns([...merged.values()]);
      }
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [projectIdsKey]);
  return runs;
}
