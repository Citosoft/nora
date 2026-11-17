import { ArrowLeft } from "lucide-react";
import type { WorkflowSurfaceProps, WorkflowSurfaceWidth } from "@/components/app/types/workflowSurface.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLUMN_WIDTH: Record<WorkflowSurfaceWidth, string> = { form: "max-w-3xl", wide: "max-w-6xl" };

/** A workflow sub-view: a slim back header, a centered scrolling column, and an optional pinned footer for actions. */
export function WorkflowSurface({ title, onBack, width = "form", footer, children }: WorkflowSurfaceProps) {
  const column = cn("mx-auto w-full px-6 sm:px-10", COLUMN_WIDTH[width]);
  return <section aria-label={title} className="flex h-full min-h-0 flex-col">
    <header className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label="Back to workflows" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden="true" /></Button>
      <h1 className="truncate text-sm font-semibold">{title}</h1>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto"><div className={cn(column, "flex flex-col gap-8 py-8 sm:py-10")}>{children}</div></div>
    {footer && <footer className="shrink-0 border-t py-3"><div className={cn(column, "flex items-center gap-2")}>{footer}</div></footer>}
  </section>;
}
