import { useState } from "react";
import { ArrowLeft, ArrowUpRight, CircleDot, LoaderCircle, MessageSquarePlus, RefreshCcw } from "lucide-react";
import type { IssueDetailPanelProps } from "@/components/app/types/forge-items/issue.types";
import { formatForgeIssueInstruction, issueReference } from "@/components/app/logic/forge-items/issueReference";
import { IssueReferencePill } from "@/components/app/shared/IssueReferencePill";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IssueDiscussion } from "./IssueDiscussion";

export function IssueDetailPanel({ detail, detailLoading, detailErrorMessage, actionLoading, commentLoading, repoFullName,
  onBackToList, onRefreshDetail, onOpenUrl, onAction, onCommentSubmit, onStartIssueThread }: IssueDetailPanelProps) {
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const reference = issueReference(detail.item);
  const busy = detailLoading || actionLoading;
  const start = async (): Promise<void> => {
    if (starting) return;
    setStarting(true); setStartError(null);
    try { await onStartIssueThread(); }
    catch (cause) { setStartError(cause instanceof Error ? cause.message : "Unable to start the fix thread."); }
    finally { setStarting(false); }
  };
  return <section aria-label={`Issue #${detail.item.number}`} className="flex h-full min-h-0 flex-col bg-background">
    <header className="workspace-shell-surface workspace-chrome-surface flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBackToList}><ArrowLeft className="size-4" aria-hidden="true" />Issues</Button>
        <span className="truncate text-xs text-muted-foreground">{repoFullName || detail.item.sourceRepository || "Repository issue"}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" disabled={busy} onClick={onRefreshDetail}><RefreshCcw className={`size-3.5 ${detailLoading ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />Refresh</Button>
        <Button variant="outline" size="sm" onClick={() => onOpenUrl(detail.item.webUrl)}>Open in {reference.provider === "gitlab" ? "GitLab" : "GitHub"}<ArrowUpRight className="size-3.5" aria-hidden="true" /></Button>
      </div>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-5 py-7 sm:px-8 sm:py-9">
        {detailErrorMessage && <p role="alert" className="text-sm text-destructive">{detailErrorMessage}</p>}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3"><IssueReferencePill reference={reference} /><span className="inline-flex items-center gap-1.5 text-xs capitalize text-muted-foreground"><CircleDot className="size-3.5" aria-hidden="true" />{detail.item.state}</span></div>
          <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{detail.item.title}</h1>
          <p className="text-xs text-muted-foreground">{detail.item.author || "Unknown author"} · Updated {new Date(detail.item.updatedAt).toLocaleString()}</p>
          {detail.labels.length > 0 && <div className="flex flex-wrap gap-2">{detail.labels.map((label) => <Badge key={label} variant="outline">{label}</Badge>)}</div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/25 p-4 sm:p-5">
          <div className="min-w-0 flex-1"><h2 className="text-sm font-medium">Work on this issue</h2><MarkdownRenderer className="mt-2 text-muted-foreground">{formatForgeIssueInstruction(detail)}</MarkdownRenderer></div>
          <Button disabled={busy || starting} onClick={() => void start()}>{starting ? <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <MessageSquarePlus className="size-4" aria-hidden="true" />}{starting ? "Starting thread…" : "Start fix thread"}</Button>
          {startError && <p role="alert" className="w-full text-sm text-destructive">{startError}</p>}
        </div>
        <section aria-label="Issue description" className="border-b border-border/60 pb-8">
          {detail.body.trim() ? <MarkdownRenderer allowHtml className="break-words text-sm">{detail.body}</MarkdownRenderer> : <p className="text-sm text-muted-foreground">No description provided.</p>}
        </section>
        <IssueDiscussion detail={detail} commentLoading={commentLoading} onCommentSubmit={onCommentSubmit} />
        {(detail.canClose || detail.canReopen) && <div className="flex justify-end border-t border-border/60 pt-5"><Button variant="outline" size="sm" disabled={busy} onClick={() => onAction(detail.canClose ? "close" : "reopen")}>{detail.canClose ? "Close issue" : "Reopen issue"}</Button></div>}
      </div>
    </div>
  </section>;
}
