import { ArrowRight, FolderOpen, GitBranch, MessageSquarePlus, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORKSPACE_TOOLS } from "@/components/app/constants/workspaceTools";
import { ThreadStatusIcon } from "../threads/ThreadStatusIcon";
import type { WorkspaceHomeProps } from "@/components/app/types/workspace-home/home.types";
import type { WorkspaceToolId } from "@/components/app/types/workspaceNavigation.types";

const toolDescriptions: Record<WorkspaceToolId, string> = {
  "merge-requests": "Review workspace merge requests",
  issues: "Browse workspace issues",
  documents: "Notes, specs & project files", tasks: "Plan what comes next", terminals: "Your command line",
  worktrees: "Isolated branches of work", browser: "Preview your project", workflows: "Repeatable runs"
};
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export function WorkspaceHome({ workspace, activity, loading, error, onNewThread, onOpenThread, onRetry, onOpenTool, commands }: WorkspaceHomeProps) {
  return <section aria-label="Workspace home" className="workspace-home min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-9 px-6 py-10 sm:px-10 sm:py-14">
      <header className="min-w-0">
        <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground"><FolderOpen className="size-4" aria-hidden="true" /><span>Workspace overview</span></div>
        <h1 className="break-words text-3xl font-semibold tracking-tight">{workspace?.name ?? "Your workspace"}</h1>
        {workspace && <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {workspace.kind === "repository" && workspace.workspace.branch && <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1"><GitBranch className="size-3 shrink-0" aria-hidden="true" /><span className="truncate" title={workspace.workspace.branch}>{workspace.workspace.branch}</span></span>}
          <span className="min-w-0 truncate font-mono text-[11px]" title={workspace.workspace.path}>{workspace.kind === "personal" ? "A space for ideas and everyday work" : workspace.workspace.path}</span>
        </div>}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-5 rounded-lg border bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div><h2 className="text-lg font-medium tracking-tight">What’s next for this project?</h2><p className="mt-1 text-sm text-muted-foreground">Bring an idea, tackle a bug, or explore the code.</p></div>
        <Button onClick={onNewThread} disabled={!workspace} className="gap-2"><MessageSquarePlus className="size-4" aria-hidden="true" />New thread<ArrowRight className="ml-2 size-3.5" aria-hidden="true" /></Button>
      </div>

      {commands}

      <section aria-labelledby="home-activity-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="home-activity-title" className="text-sm font-medium">Pick up where you left off</h2>
          {!loading && !error && activity.total > 0 && <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Workspace activity">
            <span>{activity.active} in progress</span><span className={activity.attention ? "text-amber-600 dark:text-amber-400" : ""}>{activity.attention} {activity.attention === 1 ? "needs" : "need"} attention</span>{activity.unread > 0 && <span className="text-primary">{activity.unread} unread</span>}
          </p>}
        </div>
        {error && <div role="alert" className="mt-3 flex items-center justify-between gap-3 rounded-md border p-3 text-sm"><span>{error}</span><Button size="sm" variant="outline" onClick={onRetry}>Retry</Button></div>}
        <div className="mt-3 border-y">
          {activity.recent.map((row) => <button key={row.id} type="button" onClick={() => onOpenThread(row)} className="group flex w-full items-center gap-3 border-b px-2 py-3.5 text-left last:border-0 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60"><ThreadStatusIcon row={row} />{!row.attention && !row.working && !row.unread && row.status !== "Interrupted" && <MessageSquarePlus className="size-3.5 text-muted-foreground" aria-hidden="true" />}</span>
            <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className={`truncate text-sm ${row.unread ? "font-semibold" : "font-medium"}`}>{row.title}</span>{row.pinned && <Pin className="size-3 shrink-0 text-muted-foreground" aria-label="Pinned" />}</span><span className="mt-0.5 block text-xs text-muted-foreground">{row.status}{row.queuedCount > 0 ? ` · ${row.queuedCount} queued` : ""}</span></span>
            <time className="shrink-0 text-[11px] text-muted-foreground" dateTime={row.updatedAt}>{dateFormat.format(new Date(row.updatedAt))}</time><ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
          </button>)}
          {!activity.recent.length && <div role="status" className="py-7 text-sm text-muted-foreground">{loading ? "Loading workspace activity…" : error ? "Workspace activity couldn’t be loaded." : workspace ? "A fresh start. Your threads will appear here as you work." : "Choose a workspace from the sidebar to get started."}</div>}
        </div>
        {activity.total > activity.recent.length && <p className="mt-3 text-xs text-muted-foreground">Showing {activity.recent.length} of {activity.total} threads · Find all threads in the sidebar</p>}
      </section>

      {onOpenTool && <section aria-labelledby="home-tools-title"><h2 id="home-tools-title" className="mb-3 text-sm font-medium">Project tools</h2><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {WORKSPACE_TOOLS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onOpenTool(id)} className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-left transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" /><span><span className="block text-sm font-medium">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{toolDescriptions[id]}</span></span>
        </button>)}
      </div></section>}
    </div>
  </section>;
}
