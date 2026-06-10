import { formatForgeReviewLineLabel } from "@/components/app/logic/forgeReviewHandoff";
import { formatLoopRunReviewWorkItemLabel } from "@/components/app/logic/loopRunReviewFeedback";
import type { LoopRunReviewFeedbackState } from "@/components/app/hooks/useLoopRunReviewFeedback";
import { Field } from "@/components/app/shared/Field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface LoopRunReviewFeedbackPickerProps {
  reviewFeedback: LoopRunReviewFeedbackState;
}

export function LoopRunReviewFeedbackPicker({ reviewFeedback }: LoopRunReviewFeedbackPickerProps) {
  const {
    workItems,
    selectedWorkItemNumber,
    handleWorkItemChange,
    isLoadingOverview,
    overviewErrorMessage,
    isLoadingDetail,
    detailErrorMessage,
    commentSelections,
    selectedCommentIds,
    toggleComment,
    selectAllComments,
    clearComments
  } = reviewFeedback;

  return (
    <div className="space-y-4 rounded-lg border border-border/70 bg-muted/10 p-4">
      <Field label="Pull or merge request">
        <Select
          value={selectedWorkItemNumber === null ? "" : String(selectedWorkItemNumber)}
          onChange={(event) => {
            const value = event.target.value.trim();
            handleWorkItemChange(value ? Number(value) : null);
          }}
          disabled={isLoadingOverview || workItems.length === 0}
        >
          <option value="">
            {isLoadingOverview ? "Loading open reviews..." : workItems.length ? "Choose a review" : "No open reviews found"}
          </option>
          {workItems.map((item) => (
            <option key={`${item.id}-${item.number}`} value={String(item.number)}>
              {formatLoopRunReviewWorkItemLabel(item)}
            </option>
          ))}
        </Select>
      </Field>

      {overviewErrorMessage ? <p className="text-xs text-destructive">{overviewErrorMessage}</p> : null}
      {!isLoadingOverview && workItems.length === 0 && !overviewErrorMessage ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Connect GitHub or GitLab in Settings and open a pull or merge request with inline review comments to use this template.
        </p>
      ) : null}

      {selectedWorkItemNumber !== null ? (
        <div className="space-y-3 border-t border-border/70 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Review comments</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllComments}
                disabled={isLoadingDetail || selectedCommentIds.length === commentSelections.length || commentSelections.length === 0}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearComments}
                disabled={isLoadingDetail || selectedCommentIds.length === 0}
              >
                Clear
              </Button>
            </div>
          </div>

          {isLoadingDetail ? <p className="text-xs text-muted-foreground">Loading review comments...</p> : null}
          {detailErrorMessage ? <p className="text-xs text-destructive">{detailErrorMessage}</p> : null}
          {!isLoadingDetail && !detailErrorMessage && commentSelections.length === 0 ? (
            <p className="text-xs leading-5 text-muted-foreground">
              This pull or merge request has no inline review comments to address.
            </p>
          ) : null}

          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {commentSelections.map((comment) => {
              const checkboxId = `loop-run-review-${comment.commentId}`;
              const isSelected = selectedCommentIds.includes(comment.commentId);
              return (
                <label
                  key={comment.commentId}
                  htmlFor={checkboxId}
                  className="flex cursor-pointer gap-3 rounded-md border border-border/50 bg-background/70 p-3 transition hover:border-primary/40 hover:bg-accent/20"
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-primary"
                    checked={isSelected}
                    onChange={(event) => toggleComment(comment.commentId, event.target.checked)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-foreground/90">{comment.path}</span>
                      <span>{formatForgeReviewLineLabel(comment.oldLine, comment.newLine)}</span>
                      <span>{comment.author || "Unknown"}</span>
                    </div>
                    <div className="terminal-text mt-2 overflow-x-auto rounded-[4px] border border-border/40 bg-background/70 px-2 py-1 text-[11px] leading-5">
                      {comment.lineText || "(line context unavailable)"}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-5 text-foreground/85">
                      {comment.body}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          {commentSelections.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {selectedCommentIds.length} of {commentSelections.length} comment{commentSelections.length === 1 ? "" : "s"} selected
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
