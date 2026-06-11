import { groupBrowserAnnotationsByUrl } from "@/components/app/logic/browserAnnotation";
import {
  browserReviewCommentAccentClass,
  browserReviewCommentRowBodyClass,
  browserReviewCommentRowClass,
  browserReviewCommentSurfaceClass
} from "@/components/app/panels/browser-annotation/browserAnnotationUi";
import type { UseBrowserAnnotationsStateResult } from "@/components/app/types/browserAnnotationContext.types";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, LoaderCircle, MessageSquare, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type BrowserReviewTrayProps = {
  reviewState: Pick<
    UseBrowserAnnotationsStateResult,
    | "annotations"
    | "annotationCount"
    | "isSendingReview"
    | "removeAnnotation"
    | "clearAnnotations"
    | "sendReviewToAgent"
    | "spawnReviewAgent"
    | "runningAgentTargets"
    | "availableTools"
  >;
};

export function BrowserReviewTray({ reviewState }: BrowserReviewTrayProps) {
  const {
    annotations,
    annotationCount,
    isSendingReview,
    removeAnnotation,
    clearAnnotations,
    sendReviewToAgent,
    spawnReviewAgent,
    runningAgentTargets,
    availableTools
  } = reviewState;
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const groupedAnnotations = useMemo(() => groupBrowserAnnotationsByUrl(annotations), [annotations]);

  useEffect(() => {
    if (!runningAgentTargets.length) {
      setSelectedAgentId("");
      return;
    }

    setSelectedAgentId((current) =>
      current && runningAgentTargets.some((agent) => agent.id === current) ? current : runningAgentTargets[0]?.id ?? ""
    );
  }, [runningAgentTargets]);

  if (annotationCount === 0) {
    return null;
  }

  const handleSendReview = async () => {
    if (!selectedAgentId) {
      setSendError("Choose a running agent to receive this review.");
      return;
    }

    setSendError(null);
    try {
      await sendReviewToAgent(selectedAgentId);
    } catch (error: unknown) {
      const detail = error instanceof Error && error.message.trim() ? error.message.trim() : "Could not send review to the agent.";
      setSendError(detail);
    }
  };

  return (
    <div className="shrink-0 border-t border-border/50 bg-card/95">
      <div className="border-b border-border/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <MessageSquare className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">Browser review</span>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold normal-case tracking-normal">
              {annotationCount}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => setIsExpanded((current) => !current)}
              aria-label={isExpanded ? "Collapse browser review section" : "Expand browser review section"}
            >
              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-destructive"
              onClick={clearAnnotations}
              aria-label="Clear all browser comments"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="space-y-2 px-3 py-2">
          <div className="max-h-52 space-y-2 overflow-auto">
            {[...groupedAnnotations.entries()].map(([pageUrl, pageAnnotations]) => (
              <div key={pageUrl} className="rounded-[6px] border border-border/50 bg-background/55 p-2">
                <div className="mb-1 truncate text-[11px] font-medium text-muted-foreground" title={pageUrl}>
                  {pageAnnotations[0]?.target.pageTitle || pageUrl}
                </div>
                <div className="space-y-1">
                  {pageAnnotations.map((annotation) => {
                    const elementLabel = annotation.target.tagName.toLowerCase();
                    return (
                      <div
                        key={annotation.id}
                        className={cn("overflow-hidden", browserReviewCommentSurfaceClass, browserReviewCommentRowClass)}
                        title={annotation.body}
                      >
                        <div className={browserReviewCommentAccentClass} aria-hidden="true" />
                        <Badge
                          variant="outline"
                          className="h-5 shrink-0 border-primary/30 bg-background/70 px-1.5 font-mono text-[10px] text-primary"
                        >
                          {elementLabel}
                        </Badge>
                        <p className={browserReviewCommentRowBodyClass}>{annotation.body}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 opacity-0 transition group-hover/review:opacity-100"
                          onClick={() => removeAnnotation(annotation.id)}
                          aria-label="Remove browser comment"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[6px] border border-border/50 bg-background/55 p-2">
            {sendError ? <div className="mb-2 text-xs text-destructive">{sendError}</div> : null}
            {!runningAgentTargets.length ? (
              <div className="space-y-2">
                <p className="text-xs leading-none text-muted-foreground">
                  Spawn a new agent with this browser review collection.
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTools.map((tool) => (
                    <Button
                      key={tool.id}
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 px-2.5 text-[11px] font-semibold"
                      disabled={isSendingReview}
                      onClick={() => void spawnReviewAgent(tool.id)}
                    >
                      {isSendingReview ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                      <AgentToolIcon
                        toolId={tool.id}
                        label={tool.label}
                        className="size-4 shrink-0 rounded-sm"
                        imageClassName="size-3.5 rounded-sm"
                      />
                      Spawn {tool.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <Select
                  value={selectedAgentId}
                  onChange={(event) => setSelectedAgentId(event.target.value)}
                  className="h-7 min-w-0 flex-1 bg-background/60 text-[11px]"
                  disabled={isSendingReview}
                >
                  {runningAgentTargets.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.label} · {agent.toolLabel}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 px-2.5 text-[11px] font-semibold"
                  disabled={!selectedAgentId || isSendingReview}
                  onClick={() => void handleSendReview()}
                >
                  {isSendingReview ? (
                    <>
                      <LoaderCircle className="size-3.5 animate-spin" />
                      Sending
                    </>
                  ) : (
                    "Send to agent"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
