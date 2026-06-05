import { useDiffAnnotations } from "@/components/app/context/diffAnnotationContext";
import { buildDiffAnnotationKey, canAnnotateDiffLine } from "@/components/app/logic/diffAnnotation";
import { parseDiffLines } from "@/components/app/logic/forgePanelDiff";
import { diffLineClass } from "@/components/app/logic/utils";
import {
  diffReviewAnnotatedLineClass,
  diffReviewCommentAccentClass,
  diffReviewCommentBodyClass,
  diffReviewCommentLabelClass,
  diffReviewCommentSurfaceClass,
  diffReviewComposerSurfaceClass,
  diffReviewComposerTextareaClass
} from "@/components/app/panels/diff-annotation/diffAnnotationUi";
import type { ResolvedTheme } from "@/components/app/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DiffAnnotationLineTarget } from "@shared/appTypes";
import { MessageSquarePlus, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

type AnnotatedDiffLinesProps = {
  diff: string;
  filePath: string;
  resolvedTheme: ResolvedTheme;
  className?: string;
};

type InlineComposerProps = {
  onSave: (body: string) => void;
  onCancel: () => void;
  disabled?: boolean;
};

const InlineComposer = ({ onSave, onCancel, disabled = false }: InlineComposerProps) => {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      const next = draft.trim();
      if (next) {
        onSave(next);
      }
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={diffReviewComposerSurfaceClass}>
      <div className="flex items-center gap-1.5">
        <MessageSquarePlus className="size-3.5 text-primary" />
        <span className={diffReviewCommentLabelClass}>Add review</span>
      </div>
      <Textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write an inline comment"
        className={diffReviewComposerTextareaClass}
        disabled={disabled}
      />
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!draft.trim() || disabled}
          onClick={() => {
            const next = draft.trim();
            if (next) {
              onSave(next);
            }
          }}
        >
          Add comment
        </Button>
      </div>
    </div>
  );
};

const AnnotationCard = ({
  body,
  onRemove
}: {
  body: string;
  onRemove: () => void;
}) => (
  <div className={cn("group/note relative mt-1", diffReviewCommentSurfaceClass)}>
    <div className={diffReviewCommentAccentClass} aria-hidden="true" />
    <div className="flex items-start gap-2 px-3 py-2.5 pl-3.5">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <MessageSquarePlus className="size-3.5 text-primary" />
          <span className={diffReviewCommentLabelClass}>Review</span>
        </div>
        <p className={diffReviewCommentBodyClass}>{body || "(empty)"}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-5 shrink-0 opacity-0 transition group-hover/note:opacity-100"
        onClick={onRemove}
        aria-label="Remove inline comment"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  </div>
);

export function AnnotatedDiffLines({ diff, filePath, resolvedTheme, className }: AnnotatedDiffLinesProps) {
  const {
    annotationsEnabled,
    composerTarget,
    openComposer,
    closeComposer,
    addAnnotation,
    removeAnnotation,
    getAnnotationsForLine
  } = useDiffAnnotations();

  const lines = parseDiffLines(diff);

  const handleOpenComposer = useCallback(
    (target: DiffAnnotationLineTarget) => {
      openComposer(target);
    },
    [openComposer]
  );

  return (
    <div className={className}>
      {lines.map((line) => {
        const inlineKey = buildDiffAnnotationKey(filePath, line.oldLine, line.newLine);
        const lineAnnotations = getAnnotationsForLine(filePath, line.oldLine, line.newLine);
        const canAnnotate = annotationsEnabled && canAnnotateDiffLine(line);
        const isComposerOpen = composerTarget?.key === inlineKey;
        const hasExtraContent = lineAnnotations.length > 0 || isComposerOpen;

        return (
          <div key={`${filePath}-${line.key}`} className={hasExtraContent ? "space-y-1" : undefined}>
            <div className="group flex items-start gap-2">
              <div
                className={cn(
                  "min-w-0 flex-1 whitespace-pre-wrap break-words px-2 font-mono text-[12px] leading-6",
                  lineAnnotations.length > 0 && diffReviewAnnotatedLineClass,
                  diffLineClass(line.text, resolvedTheme)
                )}
              >
                {line.text || " "}
              </div>
              {canAnnotate ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-5 shrink-0 opacity-0 transition group-hover:opacity-100",
                    isComposerOpen && "opacity-100",
                    lineAnnotations.length > 0 && "text-primary opacity-100"
                  )}
                  onClick={() =>
                    handleOpenComposer({
                      path: filePath,
                      oldLine: line.oldLine,
                      newLine: line.newLine,
                      lineText: line.text
                    })
                  }
                  aria-label="Add inline comment"
                >
                  <Plus className="size-3.5" />
                </Button>
              ) : null}
            </div>

            {lineAnnotations.map((annotation) => (
              <AnnotationCard key={annotation.id} body={annotation.body} onRemove={() => removeAnnotation(annotation.id)} />
            ))}

            {isComposerOpen && composerTarget ? (
              <InlineComposer onSave={(body) => addAnnotation(composerTarget, body)} onCancel={closeComposer} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
