import { WorkspaceAvatar } from "@/components/app/shared/WorkspaceAvatar";
import { WorkspaceHomeActivity } from "./WorkspaceHomeActivity";
import { WorkspaceHomeComposer } from "./WorkspaceHomeComposer";
import { WorkspaceHomeTools } from "./WorkspaceHomeTools";
import type { WorkspaceHomeProps } from "@/components/app/types/workspace-home/home.types";

export function WorkspaceHome({ workspace, activity, requests, providerLabels, loading, error, onNewThread, onOpenThread, onRetry, onOpenTool, branchStatus, commands, tasks }: WorkspaceHomeProps) {
  const hasSideColumn = Boolean(tasks || commands || onOpenTool);
  const projectId = workspace?.shellProjectId ?? null;
  return <section aria-label="Workspace home" className="workspace-home min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8">
      <header className="relative overflow-hidden rounded-xl border bg-card/60">
        {/* The dot grid fades in from the left so the name sits on clean ground. */}
        <div aria-hidden="true" className="pixel-dots pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_right,transparent_15%,black)]" />
        <div className="relative flex flex-col gap-4 px-5 py-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 items-center gap-3">
              {workspace && <span className="pixel-pop-in"><WorkspaceAvatar workspace={{ id: projectId ?? workspace.id, name: workspace.name }} size="large" /></span>}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{workspace?.kind === "personal" ? "Personal space" : "Workspace"}</p>
                <h1 className="break-words text-2xl font-semibold tracking-tight">{workspace?.name ?? "Your workspace"}</h1>
              </div>
            </div>
            {workspace && <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              {branchStatus}
              <span className="min-w-0 truncate font-mono text-[10px]" title={workspace.workspace.path}>{workspace.kind === "personal" ? "A space for ideas and everyday work" : workspace.workspace.path}</span>
            </div>}
          </div>
          <WorkspaceHomeComposer disabled={!workspace} onStart={onNewThread} />
        </div>
      </header>

      <div className={hasSideColumn ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start" : ""}>
        <WorkspaceHomeActivity workspace={workspace} activity={activity} requests={requests} providerLabels={providerLabels} loading={loading} error={error} onOpenThread={onOpenThread} onRetry={onRetry} />
        {hasSideColumn && <aside aria-label="Project shortcuts" className="flex min-w-0 flex-col gap-6">
          {onOpenTool && <WorkspaceHomeTools onOpenTool={onOpenTool} projectId={projectId} git={workspace?.workspace.versionControl === "git"} />}
          {tasks}
          {commands}
        </aside>}
      </div>
    </div>
  </section>;
}
