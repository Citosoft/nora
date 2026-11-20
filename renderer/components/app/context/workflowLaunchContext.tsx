import { createContext, useCallback, useMemo, useState } from "react";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import type { WorkflowLaunchProviderProps, WorkflowLaunchValue, WorkflowToolRequest } from "@/components/app/types/workflowLaunch.types";

/** Carries "run this workflow for this task" (from Tasks) and "show this run" (from the inbox) to the Workflows tool, which stays mounted between visits. */
export const WorkflowLaunchContext = createContext<WorkflowLaunchValue | null>(null);

export function WorkflowLaunchProvider({ children }: WorkflowLaunchProviderProps) {
  const { openTool } = useWorkspaceNavigation();
  const [request, setRequest] = useState<WorkflowToolRequest | null>(null);
  const runTaskWorkflow = useCallback<WorkflowLaunchValue["runTaskWorkflow"]>((projectId, definitionId, task) => {
    setRequest((current) => ({ kind: "setup", projectId, definitionId, task, revision: (current?.revision ?? 0) + 1 }));
    openTool(projectId, "workflows");
  }, [openTool]);
  const openRun = useCallback<WorkflowLaunchValue["openRun"]>((projectId, runId) => {
    setRequest((current) => ({ kind: "monitor", projectId, runId, revision: (current?.revision ?? 0) + 1 }));
    openTool(projectId, "workflows");
  }, [openTool]);
  const settleRequest = useCallback((revision: number) => {
    setRequest((current) => current?.revision === revision ? null : current);
  }, []);
  const value = useMemo<WorkflowLaunchValue>(() => ({ request, runTaskWorkflow, openRun, settleRequest }), [request, runTaskWorkflow, openRun, settleRequest]);
  return <WorkflowLaunchContext.Provider value={value}>{children}</WorkflowLaunchContext.Provider>;
}
