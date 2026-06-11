import { formatDiffPreview, getInlineCommentKey, parseDiffLines } from "@/components/app/logic/forgePanelDiff";
import { formatForgeReviewLineLabel } from "@/components/app/logic/forgeReviewHandoff";
import { resolveMonacoLanguageId } from "@/components/app/logic/fileEditorMonaco";
import { diffLineClass } from "@/components/app/logic/utils";
import { ForgeDiffCodeLine } from "@/components/app/panels/ForgeDiffCodeLine";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import type { ForgeChangedFileProps, ForgeInlineComposerTarget } from "@/components/app/types/forgeChangedFile.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, MessageSquare, Plus, Send, X } from "lucide-react";
import { useMemo, useState } from "react";

export function ForgeChangedFile({
  change,
  commentsByLine,
  expanded,
  supportsInlineComments,
  commentLoading,
  resolvedTheme,
  onToggle,
  onCommentSubmit
}: ForgeChangedFileProps) {
  const [inlineCommentDraft, setInlineCommentDraft] = useState("");
  const [inlineComposerTarget, setInlineComposerTarget] = useState<ForgeInlineComposerTarget | null>(null);
  const languageId = expanded ? resolveMonacoLanguageId(change.path) : "plaintext";
  const lines = useMemo(
    () => expanded ? parseDiffLines(formatDiffPreview(change.diff)) : [],
    [change.diff, expanded]
  );

  const closeComposer = (): void => {
    setInlineComposerTarget(null);
    setInlineCommentDraft("");
  };

  return (
    <div id={`forge-change-${change.id}`} className="overflow-hidden rounded-[6px] border border-border/50 bg-background/55">
      <button
        type="button"
        className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs text-muted-foreground transition hover:bg-accent/30"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown className="mt-0.5 size-3.5 shrink-0" /> : <ChevronRight className="mt-0.5 size-3.5 shrink-0" />}
        <span className="min-w-0 flex-1 break-all text-foreground/90">{change.path}</span>
        <span className="shrink-0 text-emerald-600 dark:text-emerald-300">+{change.additions}</span>
        <span className="shrink-0 text-red-600 dark:text-red-300">-{change.deletions}</span>
      </button>
      {change.previousPath ? (
        <div className="border-t border-border/40 px-8 py-1.5 text-[11px] text-muted-foreground">
          Renamed from {change.previousPath}
        </div>
      ) : null}
      {expanded ? (
        <div className="terminal-text overflow-x-auto whitespace-pre border-t border-border/50 bg-background/70 p-2 text-[11px] leading-5">
          {lines.map((line) => {
            const inlineKey = getInlineCommentKey(change.path, line.oldLine, line.newLine);
            const inlineComments = commentsByLine.get(inlineKey) ?? [];
            const canCommentInline = supportsInlineComments && (line.oldLine !== null || line.newLine !== null);
            return (
              <div key={`${change.id}-${line.key}`} className="space-y-1">
                <div className="group flex items-start gap-2">
                  <div className="mt-[1px] w-16 shrink-0 text-[10px] text-muted-foreground/80">
                    {line.oldLine ?? " "} | {line.newLine ?? " "}
                  </div>
                  <div className={cn("min-w-0 flex-1 whitespace-pre-wrap break-words px-1", diffLineClass(line.text, resolvedTheme))}>
                    <ForgeDiffCodeLine text={line.text} languageId={languageId} resolvedTheme={resolvedTheme} />
                  </div>
                  {canCommentInline ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-0.5 size-6 rounded-[4px] border border-transparent bg-background/80 opacity-0 shadow-sm transition hover:border-primary/30 hover:bg-primary/10 group-hover:opacity-100"
                      onClick={() => {
                        setInlineComposerTarget({
                          key: inlineKey,
                          path: change.path,
                          oldLine: line.oldLine,
                          newLine: line.newLine
                        });
                        setInlineCommentDraft("");
                      }}
                      aria-label={`Add inline comment to ${change.path}`}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
                {inlineComments.length ? (
                  <div className="ml-[4.5rem] mt-2 space-y-3 border-l-2 border-primary/70 pl-3">
                    {inlineComments.map((comment) => (
                      <div key={comment.id} className="whitespace-normal rounded-[6px] border border-primary/25 bg-primary/5 p-3 font-sans text-xs shadow-sm shadow-primary/5">
                        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                          <MessageSquare className="size-3.5 text-primary" aria-hidden />
                          <span className="font-medium text-foreground">{comment.author || "Unknown"}</span>
                          <span>{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        {comment.body.trim() ? (
                          <MarkdownRenderer className="space-y-2 text-[13px] leading-5 text-foreground/90">{comment.body}</MarkdownRenderer>
                        ) : (
                          <div className="text-sm text-muted-foreground">No comment body provided.</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
                {inlineComposerTarget?.key === inlineKey ? (
                  <div className="ml-[4.5rem] mt-2 overflow-hidden rounded-[6px] border border-primary/35 bg-background/95 shadow-lg shadow-primary/10">
                    <div className="flex items-center justify-between gap-3 border-b border-border/45 bg-primary/5 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Inline review</div>
                        <div className="mt-0.5 truncate font-sans text-xs text-muted-foreground">
                          <span className="font-mono text-foreground/85">{inlineComposerTarget.path}</span>
                          <span className="px-1.5">·</span>
                          <span>{formatForgeReviewLineLabel(inlineComposerTarget.oldLine, inlineComposerTarget.newLine)}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="size-7 shrink-0 rounded-[4px]" onClick={closeComposer} disabled={commentLoading} aria-label="Cancel inline comment">
                        <X className="size-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-2 p-3">
                      <Textarea value={inlineCommentDraft} onChange={(event) => setInlineCommentDraft(event.target.value)} placeholder="Leave a review comment on this line" className="min-h-24 resize-y border-border/60 bg-card/80 text-sm leading-5 focus-visible:ring-primary/40" disabled={commentLoading} />
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-sans text-[11px] text-muted-foreground">Posts as a review comment on the pull request diff.</div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 rounded-[4px]" onClick={closeComposer} disabled={commentLoading}>Cancel</Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 rounded-[4px]"
                            disabled={!inlineCommentDraft.trim() || commentLoading}
                            onClick={() => {
                              const body = inlineCommentDraft.trim();
                              if (!body) {
                                return;
                              }
                              void onCommentSubmit({
                                body,
                                inlineTarget: {
                                  path: inlineComposerTarget.path,
                                  oldLine: inlineComposerTarget.oldLine,
                                  newLine: inlineComposerTarget.newLine
                                }
                              }).then(closeComposer);
                            }}
                          >
                            <Send className="size-3.5" />
                            {commentLoading ? "Posting" : "Comment"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
