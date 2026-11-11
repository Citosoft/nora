import { ArrowLeft } from "lucide-react";
import type { WorkflowSurfacePartProps, WorkflowSurfaceProps } from "@/components/app/types/workflowSurface.types";
import { Button } from "@/components/ui/button";

export function WorkflowSurface({ title, onBack, children }: WorkflowSurfaceProps) {
  return <section className="flex h-full min-h-0 flex-col">
    <header className="flex shrink-0 items-center gap-3 border-b px-5 py-2"><Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="size-3.5" aria-hidden="true" />Workflows</Button><h3 className="truncate text-sm font-medium">{title}</h3></header>
    {children}
  </section>;
}
export function WorkflowBody({ children, className = "" }: WorkflowSurfacePartProps) {
  return <div className={`min-h-0 flex-1 overflow-y-auto p-5 ${className}`}>{children}</div>;
}
export function WorkflowFooter({ children }: WorkflowSurfacePartProps) {
  return <footer className="shrink-0 border-t px-5 py-3">{children}</footer>;
}
