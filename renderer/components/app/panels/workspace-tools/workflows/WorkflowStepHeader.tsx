import type { WorkflowStepHeaderProps } from "@/components/app/types/workflowSurface.types";

export function WorkflowStepHeader({ title, description }: WorkflowStepHeaderProps) {
  return <div className="space-y-1">
    <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>;
}
