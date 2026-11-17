import { CircleHelp } from "lucide-react";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { WorkflowAgentAvatarProps } from "@/components/app/types/workflowSurface.types";

export function WorkflowAgentAvatar({ agent, size }: WorkflowAgentAvatarProps) {
  if (agent.avatar) return <BotAvatar avatar={agent.avatar} size={size} className="shrink-0" />;
  if (agent.botId) return <CircleHelp width={size} height={size} className="shrink-0 text-muted-foreground" aria-label="Bot unavailable" />;
  return <span className="shrink-0" style={{ width: size, height: size }}>
    <AgentToolIcon toolId={agent.toolId} label={agent.toolLabel} className="size-full" imageClassName={size <= 20 ? "size-3.5" : "size-4"} />
  </span>;
}
