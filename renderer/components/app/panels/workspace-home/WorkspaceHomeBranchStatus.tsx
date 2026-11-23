import { ExternalLink, GitBranch, GitPullRequest } from "lucide-react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useWorkspaceHomeBranch } from "@/components/app/hooks/useWorkspaceHomeBranch";
import { describeHomeBranchFacts, describeHomeChangeRequest } from "@/components/app/logic/workspace-home/branchStatus";
import type { WorkspaceHomeBranchStatusProps } from "@/components/app/types/workspace-home/branch.types";

const chip = "inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-0.5";
const requestTone: Record<string, string> = { open: "text-green-700 dark:text-green-400", draft: "text-muted-foreground", merged: "text-purple-700 dark:text-purple-400", closed: "text-destructive" };

/** The checkout's branch with its PR or MR and what it holds that the base branch does not. */
export function WorkspaceHomeBranchStatus({ workspace }: WorkspaceHomeBranchStatusProps) {
  const { request, changes } = useWorkspaceHomeBranch(workspace);
  const branch = workspace.kind === "repository" ? workspace.workspace.branch : null;
  if (!branch) return null;
  const loaded = changes.status === "ready" ? changes.value : null;
  const changeRequest = request.status === "ready" ? describeHomeChangeRequest(request.value, loaded?.provider ?? null) : null;
  const facts = loaded ? describeHomeBranchFacts(loaded) : [];
  const webUrl = changeRequest?.webUrl ?? null;
  return <div className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label="Branch status">
    <span className={chip}><GitBranch className="size-3 shrink-0" aria-hidden="true" /><span className="truncate" title={branch}>{branch}</span></span>
    {changeRequest && (webUrl
      ? <button type="button" onClick={() => void noraSystemClient.openExternalUrl(webUrl)} className={`${chip} hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`} aria-label={`Open ${changeRequest.label} in the browser`}>
        <GitPullRequest className={`size-3 shrink-0 ${requestTone[changeRequest.state] ?? ""}`} aria-hidden="true" />{changeRequest.label}<ExternalLink className="size-3 shrink-0 opacity-60" aria-hidden="true" /></button>
      : <span className={chip}><GitPullRequest className={`size-3 shrink-0 ${requestTone[changeRequest.state] ?? ""}`} aria-hidden="true" />{changeRequest.label}</span>)}
    {facts.map((fact) => <span key={fact.id} title={fact.title} className={`${chip} tabular-nums ${fact.id === "uncommitted" ? "border-amber-500/40 text-amber-700 dark:text-amber-400" : ""}`}>{fact.label}</span>)}
    {loaded && !facts.length && !changeRequest && <span className="text-muted-foreground">Up to date with {loaded.baseBranch ?? "its base branch"}</span>}
  </div>;
}
