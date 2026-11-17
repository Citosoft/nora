import { useDiffAnnotations } from "@/components/app/context/diffAnnotationContext";
import { useChangesPanelWorkspace } from "@/components/app/context/changesPanelContext";
import { groupDiffAnnotationsByPath } from "@/components/app/logic/diffAnnotation";
import {
  reviewRemoveButtonClass,
  reviewCommentBodyClass,
  reviewCommentRowClass
} from "@/components/app/logic/reviewStyles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ChevronDown, ChevronRight, LoaderCircle, MessageSquare, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

export function DiffReviewTray() {
  const {
    annotationsEnabled,
    annotations,
    annotationCount,
    isSendingReview,
    removeAnnotation,
    clearAnnotations,
    sendReviewToAgent,
    runningAgentTargets
  } = useDiffAnnotations();
  const { onOpenCreateAgentDialog } = useChangesPanelWorkspace();
  const contentId = useId();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const groupedAnnotations = useMemo(() => groupDiffAnnotationsByPath(annotations), [annotations]);

  useEffect(() => {
    if (!runningAgentTargets.length) {
      setSelectedAgentId("");
      return;
    }

    setSelectedAgentId((current) =>
      current && runningAgentTargets.some((agent) => agent.id === current) ? current : runningAgentTargets[0]?.id ?? ""
    );
  }, [runningAgentTargets]);

  if (!annotationsEnabled || annotationCount === 0) {
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
            <span className="whitespace-nowrap">Diff review</span>
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
              aria-label={isExpanded ? "Collapse diff review section" : "Expand diff review section"}
            >
              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={clearAnnotations}
              aria-label="Clear all inline comments"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div id={contentId} className="space-y-3 border-t border-border/60 px-3 py-3">
          <div className="max-h-52 space-y-3 overflow-y-auto">
            {[...groupedAnnotations.entries()].map(([path, pathAnnotations]) => (
              <div key={path} className="space-y-2">
                <div className="truncate px-1 text-xs font-medium text-muted-foreground" title={path}>
                  {path}
                </div>
                <div className="space-y-1.5">
                  {pathAnnotations.map((annotation) => {
                    const lineLabel =
                      annotation.target.newLine !== null
                        ? `L${annotation.target.newLine}`
                        : annotation.target.oldLine !== null
                          ? `L${annotation.target.oldLine}`
                          : "?";
                    return (
                      <div
                        key={annotation.id}
                        className={reviewCommentRowClass}
                        title={annotation.body}
                      >
                        <Badge
                          variant="outline"
                          className="mt-0.5 h-5 shrink-0 border-border/60 px-1.5 font-mono text-[11px] text-muted-foreground"
                        >
                          {lineLabel}
                        </Badge>
                        <p className={reviewCommentBodyClass}>{annotation.body}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={reviewRemoveButtonClass}
                          onClick={() => removeAnnotation(annotation.id)}
                          aria-label="Remove inline comment"
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
              <div className="flex min-w-0 items-center gap-2">
                <p
                  className="min-w-0 flex-1 truncate text-xs leading-none text-muted-foreground"
                  title="Start an agent in this project to send these comments."
                >
                  Start an agent in this project to send these comments.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 px-2.5 text-xs font-medium"
                  onClick={() => onOpenCreateAgentDialog()}
                >
                  New agent
                </Button>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <Select
                  value={selectedAgentId}
                  onChange={(event) => setSelectedAgentId(event.target.value)}
                  aria-label="Agent to receive diff review"
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

export function DiffReviewCountBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
      {count} comment{count === 1 ? "" : "s"}
    </Badge>
  );
}
