import { loopRunStatusLabel } from "@/components/app/logic/loopRunPresentation";
import type { WorkflowRunStatusBadgeProps } from "@/components/app/types/workflowSurface.types";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { LoopRunStatus } from "@shared/appTypes";

const BADGE_VARIANT: Record<LoopRunStatus, NonNullable<BadgeProps["variant"]>> = {
  preparing: "default", running: "default", pausing: "default", paused: "warning", completed: "success", cancelled: "secondary"
};

export function WorkflowRunStatusBadge({ status }: WorkflowRunStatusBadgeProps) {
  return <Badge variant={BADGE_VARIANT[status]}>{loopRunStatusLabel(status)}</Badge>;
}
