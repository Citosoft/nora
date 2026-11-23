import { FolderOpen } from "lucide-react";
import { WorkspaceHomeActivity } from "./WorkspaceHomeActivity";
import { WorkspaceHomeComposer } from "./WorkspaceHomeComposer";
import { WorkspaceHomeTools } from "./WorkspaceHomeTools";
import type { WorkspaceHomeProps } from "@/components/app/types/workspace-home/home.types";

export function WorkspaceHome({ workspace, activity, requests, providerLabels, loading, error, onNewThread, onOpenThread, onRetry, onOpenTool, branchStatus, commands, tasks }: WorkspaceHomeProps) {
  const hasSideColumn = Boolean(tasks || commands || onOpenTool);
  return <section aria-label="Workspace home" className="workspace-home min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-col gap-4 rounded-lg border bg-gradient-to-br from-primary/10 via-background to-background px-5 py-4">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><FolderOpen className="size-3.5" aria-hidden="true" /><span>Workspace overview</span></div>
            <h1 className="break-words text-2xl font-semibold tracking-tight">{workspace?.name ?? "Your workspace"}</h1>
          </div>
          {workspace && <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {branchStatus}
            <span className="min-w-0 truncate font-mono text-[11px]" title={workspace.workspace.path}>{workspace.kind === "personal" ? "A space for ideas and everyday work" : workspace.workspace.path}</span>
          </div>}
        </div>
        <WorkspaceHomeComposer disabled={!workspace} onStart={onNewThread} />
      </header>

      <div className={hasSideColumn ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start" : ""}>
        <WorkspaceHomeActivity workspace={workspace} activity={activity} requests={requests} providerLabels={providerLabels} loading={loading} error={error} onOpenThread={onOpenThread} onRetry={onRetry} />
        {hasSideColumn && <aside aria-label="Project shortcuts" className="flex min-w-0 flex-col gap-6">
          {tasks}
          {commands}
          {onOpenTool && <WorkspaceHomeTools onOpenTool={onOpenTool} />}
        </aside>}
      </div>
    </div>
  </section>;
}
