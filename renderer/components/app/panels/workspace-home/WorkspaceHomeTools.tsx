import { WORKSPACE_TOOLS } from "@/components/app/constants/workspaceTools";
import type { WorkspaceHomeToolsProps } from "@/components/app/types/workspace-home/home.types";
import type { WorkspaceToolId } from "@/components/app/types/workspaceNavigation.types";

const toolDescriptions: Record<WorkspaceToolId, string> = {
  "merge-requests": "Review workspace merge requests",
  issues: "Browse workspace issues",
  documents: "Notes, specs & project files",
  library: "Images and files agents made",
  tasks: "Plan what comes next",
  terminals: "Your command line",
  worktrees: "Isolated branches of work",
  browser: "Preview your project",
  workflows: "Repeatable runs"
};

/** Compact tool grid: three columns when stacked under the threads, two inside the side column. */
export function WorkspaceHomeTools({ onOpenTool }: WorkspaceHomeToolsProps) {
  return <section aria-labelledby="home-tools-title">
    <h2 id="home-tools-title" className="mb-3 text-sm font-medium">Project tools</h2>
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
      {WORKSPACE_TOOLS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onOpenTool(id)} title={toolDescriptions[id]} aria-description={toolDescriptions[id]}
        className="group flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" /><span className="truncate text-sm">{label}</span>
      </button>)}
    </div>
  </section>;
}
