import { useState } from "react";
import { ExternalLink, FileDiff, GitPullRequest, LoaderCircle, RefreshCcw } from "lucide-react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { CreatePullRequestDialog } from "@/components/app/dialogs/CreatePullRequestDialog";
import { useOptionalWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import { useOptionalCenterDiffPorts } from "@/components/app/context/centerDiffContext";
import { changeRequestNoun } from "@/components/app/logic/thread-workspace/changeRequest";
import type { ThreadBranchSectionProps } from "@/components/app/types/threadInsights.types";
import { ForgeProviderIcon } from "@/components/app/views/ForgeProviderIcon";
import { Button } from "@/components/ui/button";
import { DiffCounts } from "./DiffCounts";

/** The thread checkout's branch diff against its default branch, and the PR/MR it would open. */
export function ThreadBranchSection({ branch }: ThreadBranchSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const openConnections = useOptionalWorkspaceSidebarPorts()?.onOpenConnectionsSettings;
  const centerDiff = useOptionalCenterDiffPorts();
  const diffTarget = branch.diffTarget;
  const { request, changes, create } = branch;
  const summary = changes.status === "ready" ? changes.value : null;
  const existing = request.status === "ready" && request.value?.pullRequestNumber ? request.value : null;
  const noun = changeRequestNoun(summary?.provider ?? null);
  const loading = request.status === "loading" || changes.status === "loading";
  const unavailable = request.status === "unavailable" && changes.status === "unavailable";
  return <div className="space-y-2 border-t border-border/50 pt-3">
    <div className="flex items-center gap-1.5 font-medium"><GitPullRequest className="size-3.5" aria-hidden="true" />Branch changes
      {loading && <LoaderCircle className="size-3 text-muted-foreground motion-safe:animate-spin" aria-label="Checking branch" />}
      <Button variant="ghost" size="icon" className="ml-auto size-6" aria-label="Refresh branch changes" onClick={branch.refresh} disabled={loading || unavailable}><RefreshCcw className="size-3" aria-hidden="true" /></Button></div>
    {unavailable ? <p className="text-muted-foreground">Available for connected repository threads.</p> : <>
      {summary ? <>
        <div className="flex items-center justify-between gap-2 tabular-nums">
          <span className="min-w-0 truncate" title={summary.baseBranch ? `Compared with ${summary.baseBranch}` : undefined}>{summary.files} {summary.files === 1 ? "file" : "files"}{summary.baseBranch && <span className="text-muted-foreground"> vs {summary.baseBranch}</span>}</span>
          <DiffCounts counts={{ additions: summary.additions, deletions: summary.deletions }} />
        </div>
        {centerDiff && diffTarget && summary.files > 0 && <Button size="sm" variant="ghost" className="h-7 w-full justify-start gap-1.5 px-0 text-xs" onClick={() => centerDiff.openBranchDiff(diffTarget)}>
          <FileDiff className="size-3.5 shrink-0" aria-hidden="true" />View diff</Button>}
        {(summary.uncommittedFiles > 0 || summary.partial) && <p className="text-[10px] leading-relaxed text-muted-foreground">
          {summary.uncommittedFiles > 0 && `${summary.uncommittedFiles} uncommitted ${summary.uncommittedFiles === 1 ? "file is" : "files are"} not in the ${noun} until committed. `}
          {summary.partial && "Line totals skip some untracked files."}
        </p>}
      </> : changes.status === "failed" ? <p role="status" className="text-muted-foreground">{changes.message}</p>
        : changes.status === "ready" && <p className="text-muted-foreground">Branch changes are unavailable for a detached checkout.</p>}
      {request.status === "failed" ? <p role="status" className="text-muted-foreground">{request.message}</p>
        : existing ? <Button variant="ghost" className="h-8 w-full justify-start gap-1.5 px-0 text-xs" disabled={!existing.webUrl} onClick={() => { if (existing.webUrl) void noraSystemClient.openExternalUrl(existing.webUrl); }}>
          {summary?.provider && <ForgeProviderIcon provider={summary.provider} className="size-3.5 shrink-0" />}#{existing.pullRequestNumber}<span className="ml-auto text-muted-foreground">{existing.label}</span><ExternalLink className="size-3" aria-hidden="true" /></Button>
        : request.status === "ready" && create.kind !== "ready" && <p className="text-muted-foreground">No pull or merge request found.</p>}
      {create.kind === "ready" && <Button size="sm" variant="outline" className="h-8 w-full gap-1.5 text-xs" onClick={() => setDialogOpen(true)}>
        <ForgeProviderIcon provider={create.provider} className="size-3.5 shrink-0" />Create {create.noun}<span className="truncate text-muted-foreground">into {create.baseBranch}</span></Button>}
      {create.kind === "blocked" && <p className="text-muted-foreground">{create.message}
        {create.connect && openConnections && <Button variant="ghost" className="ml-1 h-auto p-0 text-xs underline-offset-2 hover:bg-transparent hover:underline" onClick={openConnections}>Open connections</Button>}</p>}
    </>}
    {create.kind === "ready" && <CreatePullRequestDialog open={dialogOpen} provider={create.provider} sourceBranch={create.branch} baseBranch={create.baseBranch}
      availableBranches={create.branches} onOpenChange={setDialogOpen} onCreate={async (payload) => { await branch.createChangeRequest(payload); setDialogOpen(false); }} />}
  </div>;
}
