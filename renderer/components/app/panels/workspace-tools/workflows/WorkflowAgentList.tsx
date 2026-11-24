import { WorkflowAgentAvatar } from "./WorkflowAgentAvatar";
import type { WorkflowAgentListProps } from "@/components/app/types/workflowSurface.types";

export function WorkflowAgentList({ agents }: WorkflowAgentListProps) {
  return <ul className="divide-y rounded-md border">
    {agents.map((agent) => <li key={agent.id} className="flex items-center gap-3 px-3 py-2.5">
      <WorkflowAgentAvatar agent={agent} size={28} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{agent.name}</p>
        <p className="truncate text-xs text-muted-foreground">{agent.model ? `${agent.toolLabel} · ${agent.model}` : agent.toolLabel}</p>
      </div>
      <span className="shrink-0 rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{agent.kind === "writer" ? "Work" : "Review"}</span>
    </li>)}
  </ul>;
}
