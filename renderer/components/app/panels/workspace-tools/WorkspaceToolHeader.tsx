import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import type { WorkspaceToolHeaderProps } from "@/components/app/types/workspaceNavigation.types";

export function WorkspaceToolHeader({ title, workspaceName }: WorkspaceToolHeaderProps) {
  const { returnToThread } = useWorkspaceNavigation();
  return <header className="flex shrink-0 items-center gap-3 border-b border-border/60 px-5 py-3">
    <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{title} <span className="text-muted-foreground">· {workspaceName}</span></h2>
    <Button variant="ghost" size="icon" className="size-8" onClick={returnToThread} aria-label={`Close ${title.toLowerCase()}`}><X className="size-4" /></Button>
  </header>;
}
