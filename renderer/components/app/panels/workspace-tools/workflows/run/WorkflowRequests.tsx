import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useThreadWorkspaceSnapshot } from "@/components/app/hooks/useThreadWorkspaceSnapshot";
import { workflowRequestTargets } from "@/components/app/logic/workflowRequests";
import type { WorkflowRequestsProps } from "@/components/app/types/workflowSurface.types";
import { WorkflowThreadRequests } from "./WorkflowThreadRequests";

export function WorkflowRequests({ run }: WorkflowRequestsProps) {
  const { store } = useNativeRuntimePorts();
  const state = useThreadWorkspaceSnapshot(store);
  const targets = workflowRequestTargets(run.roles, state.summaries);
  if (!targets.length) return null;
  return <section className="space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4" aria-label="Workflow needs input">
    <h3 className="text-sm font-semibold">Needs your input</h3>
    {targets.map((target) => <WorkflowThreadRequests key={target.conversationId} target={target} />)}
  </section>;
}
