import { WorkflowAgentAvatar } from "./WorkflowAgentAvatar";
import type { WorkflowAgentChipsProps } from "@/components/app/types/workflowSurface.types";

/** Compact ordered stage list: each role's agent logo, role name and model. */
export function WorkflowAgentChips({ agents }: WorkflowAgentChipsProps) {
  return <ul aria-label="Agents" className="flex flex-wrap gap-1.5">
    {agents.map((agent) => {
      const model = agent.model ?? "Default model";
      return <li key={agent.id} title={`${agent.kind === "writer" ? "Work" : "Review"} · ${agent.toolLabel} · ${model}`}
        className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md border bg-background py-0.5 pl-0.5 pr-2 text-[10px]">
        <WorkflowAgentAvatar agent={agent} size={20} />
        <span className="truncate font-medium">{agent.name}</span>
        <span className="truncate text-muted-foreground">{agent.botId ? agent.toolLabel : model}</span>
      </li>;
    })}
  </ul>;
}
