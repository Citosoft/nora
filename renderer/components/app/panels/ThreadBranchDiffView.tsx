import { useMemo } from "react";
import { GitBranch, LoaderCircle, RefreshCcw } from "lucide-react";
import { useThreadBranchDiff } from "@/components/app/hooks/useThreadBranchDiff";
import { useOptionalWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import { DiffCounts } from "@/components/app/panels/conversations/DiffCounts";
import { FullDiffViewer } from "@/components/app/panels/FullDiffViewer";
import type { ThreadBranchDiffViewProps } from "@/components/app/types/centerDiff.types";
import { Button } from "@/components/ui/button";

/** A thread checkout's whole branch diff against its default branch, in the shared full-diff viewer. */
export function ThreadBranchDiffView({ target, resolvedTheme }: ThreadBranchDiffViewProps) {
  const forge = useOptionalWorkspaceSidebarPorts()?.threadForge ?? null;
  const { diff, refresh } = useThreadBranchDiff(forge, target);
  const changes = diff.status === "ready" ? diff.value : null;
  const totals = useMemo(() => changes?.reduce((sum, change) => ({ additions: sum.additions + change.additions, deletions: sum.deletions + change.deletions }),
    { additions: 0, deletions: 0 }) ?? null, [changes]);
  return <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <header className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-2 text-xs">
      <GitBranch className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 truncate font-medium" title={target.checkoutPath}>{target.branch}</span>
      {target.baseBranch && <span className="shrink-0 text-muted-foreground">vs {target.baseBranch}</span>}
      {changes && <span className="shrink-0 tabular-nums text-muted-foreground">· {changes.length} {changes.length === 1 ? "file" : "files"}</span>}
      {totals && <DiffCounts counts={totals} />}
      <Button variant="ghost" size="icon" className="ml-auto size-7" aria-label="Refresh branch diff" onClick={refresh} disabled={diff.status === "loading"}>
        {diff.status === "loading" ? <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" /> : <RefreshCcw className="size-3.5" aria-hidden="true" />}
      </Button>
    </header>
    {diff.status === "failed" ? <p role="alert" className="p-6 text-sm text-muted-foreground">{diff.message}</p>
      : diff.status === "unavailable" ? <p className="p-6 text-sm text-muted-foreground">Connect this repository to view its branch diff.</p>
      : diff.status === "loading" ? <p role="status" className="p-6 text-sm text-muted-foreground">Loading branch diff…</p>
      : !changes ? <p className="p-6 text-sm text-muted-foreground">This checkout is detached, so it has no branch diff.</p>
      : !changes.length ? <p className="p-6 text-sm text-muted-foreground">No changes{target.baseBranch ? ` from ${target.baseBranch}` : ""}.</p>
      : <FullDiffViewer changes={changes} resolvedTheme={resolvedTheme} />}
  </div>;
}
