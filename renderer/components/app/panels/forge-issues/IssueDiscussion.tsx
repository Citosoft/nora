import { useState } from "react";
import type { IssueDiscussionProps } from "@/components/app/types/forge-items/issue.types";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function IssueDiscussion({ detail, commentLoading, onCommentSubmit }: IssueDiscussionProps) {
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (): Promise<void> => {
    const body = draft.trim();
    if (!body || posting || commentLoading) return;
    setPosting(true); setError(null);
    try { await onCommentSubmit({ body }); setDraft((current) => current === draft ? "" : current); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to post this comment."); }
    finally { setPosting(false); }
  };
  return <section aria-label="Issue discussion" className="space-y-5">
    <h2 className="text-sm font-medium">Discussion <span className="ml-1 text-muted-foreground">{detail.comments.length}</span></h2>
    {detail.comments.length ? detail.comments.map((comment) => <article key={comment.id} className="space-y-3 border-b border-border/40 pb-5 last:border-0">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">{comment.author || "Unknown author"}</span><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time></div>
      {comment.body.trim() ? <MarkdownRenderer allowHtml className="break-words">{comment.body}</MarkdownRenderer> : <p className="text-sm text-muted-foreground">No comment body provided.</p>}
    </article>) : <p className="text-sm text-muted-foreground">No comments yet.</p>}
    <form className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label htmlFor={`issue-comment-${detail.item.id}`} className="text-xs font-medium">Add to the discussion</label>
      <Textarea id={`issue-comment-${detail.item.id}`} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a comment…" disabled={commentLoading || posting} className="min-h-24 resize-y" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end"><Button type="submit" size="sm" variant="outline" disabled={!draft.trim() || commentLoading || posting}>{posting || commentLoading ? "Posting…" : "Post comment"}</Button></div>
    </form>
  </section>;
}
