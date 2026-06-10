import type { LoopDefinition, LoopRun } from "@shared/appTypes";
import type { UseWorkspaceLoopsResult } from "@/components/app/types/useWorkspaceLoops.types";
import { noraLoopClient } from "@/components/app/clients/noraLoopClient";
import { useCallback, useEffect, useState } from "react";

function upsertById<T extends { id: string }>(values: T[], next: T): T[] {
  return [next, ...values.filter((value) => value.id !== next.id)];
}

export function useWorkspaceLoops(projectId: string): UseWorkspaceLoopsResult {
  const [definitions, setDefinitions] = useState<LoopDefinition[]>([]);
  const [runs, setRuns] = useState<LoopRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextDefinitions, nextRuns] = await Promise.all([
        noraLoopClient.listLoopDefinitions(projectId),
        noraLoopClient.listLoopRuns(projectId)
      ]);
      setDefinitions(nextDefinitions);
      setRuns(nextRuns);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load workflows.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
    return noraLoopClient.onLoopRunChanged((run) => {
      if (run.projectId === projectId) {
        setRuns((current) => upsertById(current, run));
      }
    });
  }, [projectId, refresh]);

  return {
    definitions,
    runs,
    isLoading,
    errorMessage,
    refresh,
    upsertDefinition: (definition) => setDefinitions((current) => upsertById(current, definition)),
    removeDefinition: async (definitionId) => {
      await noraLoopClient.deleteLoopDefinition(projectId, definitionId);
      setDefinitions((current) => current.filter((definition) => definition.id !== definitionId));
    },
    upsertRun: (run) => setRuns((current) => upsertById(current, run)),
    removeRun: async (runId) => {
      try {
        await noraLoopClient.deleteLoopRun(projectId, runId);
        setRuns((current) => current.filter((run) => run.id !== runId));
        setErrorMessage(null);
        return true;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to delete the workflow run.");
        return false;
      }
    }
  };
}
