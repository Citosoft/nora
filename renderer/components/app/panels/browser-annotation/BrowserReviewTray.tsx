import { formatBrowserElementLabel, groupBrowserAnnotationsByUrl } from "@/components/app/logic/browserAnnotation";
import { reviewRemoveButtonClass, reviewCommentBodyClass, reviewCommentRowClass } from "@/components/app/logic/reviewStyles";
import type { BrowserReviewTrayProps } from "@/components/app/types/browserAnnotationContext.types";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ChevronDown, ChevronRight, LoaderCircle, MessageSquare, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

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
  const contentId = useId();
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
    <div className="workspace-shell-surface min-h-0 shrink-0 border-t border-border/70">
      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs font-medium text-foreground">
            <MessageSquare className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">Browser review</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
              {annotationCount}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => setIsExpanded((current) => !current)}
              aria-expanded={isExpanded}
              aria-controls={contentId}
              aria-label={isExpanded ? "Collapse browser review section" : "Expand browser review section"}
            >
              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={clearAnnotations}
              aria-label="Clear all browser comments"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div id={contentId} className="space-y-3 border-t border-border/60 px-3 py-3">
          <div className="max-h-52 space-y-3 overflow-y-auto">
            {[...groupedAnnotations.entries()].map(([pageUrl, pageAnnotations]) => (
              <div key={pageUrl} className="space-y-2">
                <div className="truncate px-1 text-xs font-medium text-muted-foreground" title={pageUrl}>
                  {pageAnnotations[0]?.target.pageTitle || pageUrl}
                </div>
                <div className="space-y-1.5">
                  {pageAnnotations.map((annotation) => {
                    const elementLabel = formatBrowserElementLabel(annotation.target);
                    return (
                      <div
                        key={annotation.id}
                        className={reviewCommentRowClass}
                        title={annotation.body}
                      >
                        <Badge
                          variant="outline"
                          title={elementLabel}
                          className="mt-0.5 max-w-[40%] shrink-0 truncate border-border/60 px-1.5 font-mono text-[11px] text-muted-foreground"
                        >
                          {elementLabel}
                        </Badge>
                        <p className={reviewCommentBodyClass}>{annotation.body}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={reviewRemoveButtonClass}
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

          <div className="space-y-2 border-t border-border/60 pt-3">
            {sendError ? <div role="alert" className="text-xs text-destructive">{sendError}</div> : null}
            {!runningAgentTargets.length ? (
              <div className="space-y-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Spawn a new agent with this browser review collection.
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTools.map((tool) => (
                    <Button
                      key={tool.id}
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-2.5 text-xs font-medium"
                      disabled={isSendingReview}
                      onClick={() => void spawnReviewAgent(tool.id)}
                    >
                      {isSendingReview ? <LoaderCircle className="size-3.5 motion-safe:animate-spin" /> : null}
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
                  aria-label="Agent to receive browser review"
                  className="h-8 min-w-0 flex-1 text-xs"
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
                  className="h-8 shrink-0 px-2.5 text-xs font-medium"
                  disabled={!selectedAgentId || isSendingReview}
                  onClick={() => void handleSendReview()}
                >
                  {isSendingReview ? (
                    <>
                      <LoaderCircle className="size-3.5 motion-safe:animate-spin" />
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
