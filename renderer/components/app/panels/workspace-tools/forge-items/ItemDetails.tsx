import { ArrowRight, ArrowUpRight, GitBranch, LoaderCircle, MessageSquare } from "lucide-react";
import { requestChangeCounts } from "@/components/app/logic/forge-items/list";
import type { ItemDetailsProps } from "@/components/app/types/forge-items/list.types";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { DiffCounts } from "@/components/app/panels/conversations/DiffCounts";
import { Button } from "@/components/ui/button";

export function ItemDetails({ kind, item, state, onRetry, onOpen }: ItemDetailsProps) {
  return <div className="space-y-4 px-5 py-5 sm:pl-16 sm:pr-6">
    {kind === "pull_request" && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <GitBranch className="size-3.5" aria-hidden="true" /><code className="max-w-full break-all rounded-md bg-muted px-2 py-1 text-foreground">{item.sourceBranch || "Unknown branch"}</code>
      <ArrowRight className="size-3 shrink-0" aria-hidden="true" /><code className="max-w-full break-all rounded-md bg-muted px-2 py-1 text-foreground">{item.targetBranch || "Unknown target"}</code>
    </div>}
    {state.status === "ready" ? <>
      {state.value.body.trim() ? <div className="max-h-72 overflow-y-auto"><MarkdownRenderer className="text-sm">{state.value.body}</MarkdownRenderer></div> : <p className="text-sm text-muted-foreground">No description provided.</p>}
      {kind === "pull_request" && <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs" aria-label="Changed files">
          <thead><tr className="border-b border-border/60 text-muted-foreground"><th scope="col" className="pb-2 pr-4 font-normal">Changed files</th><th scope="col" className="pb-2 text-right font-normal">Line changes</th></tr></thead>
          <tbody>{state.value.changes.map((change) => <tr key={change.id} className="border-b border-border/40 last:border-0">
            <td className="py-2.5 pr-4"><code className="break-all">{change.path}</code>{change.previousPath && <span className="mt-1 block text-muted-foreground">Renamed from {change.previousPath}</span>}</td>
            <td className="whitespace-nowrap py-2.5 text-right"><DiffCounts counts={change} /></td>
          </tr>)}</tbody>
        </table>
        {!state.value.changes.length && <p className="py-3 text-sm text-muted-foreground">No changed files are available for this request.</p>}
      </div>}
    </> : state.status === "failed" ? <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
      <p className="text-destructive">{state.message}</p><Button type="button" variant="outline" size="sm" onClick={onRetry}>Retry details</Button>
    </div> : <div role="status" className="flex items-center gap-2 py-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />{kind === "issue" ? "Loading issue details…" : "Loading description and changed files…"}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {state.status === "ready" && <>{kind === "pull_request" && <span>{state.value.changes.length} {state.value.changes.length === 1 ? "file" : "files"}</span>}<span className="inline-flex items-center gap-1.5"><MessageSquare className="size-3.5" aria-hidden="true" />{state.value.comments.length} {state.value.comments.length === 1 ? "comment" : "comments"}</span>{kind === "pull_request" && <DiffCounts counts={requestChangeCounts(state.value.changes)} />}</>}
      </div>
      <Button type="button" size="sm" onClick={onOpen}>{kind === "issue" ? "Open issue" : "Open full review"}<ArrowUpRight className="size-3.5" aria-hidden="true" /></Button>
    </div>
  </div>;
}
