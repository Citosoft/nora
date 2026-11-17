import type { WorkflowDetailListProps } from "@/components/app/types/workflowSurface.types";

export function WorkflowDetailList({ items }: WorkflowDetailListProps) {
  return <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
    {items.map(([label, value]) => <div key={label} className="contents"><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>)}
  </dl>;
}
