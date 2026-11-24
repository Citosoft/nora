import { useDiffAnnotations } from "@/components/app/context/diffAnnotationContext";
import { buildDiffAnnotationKey, canAnnotateDiffLine } from "@/components/app/logic/diffAnnotation";
import { diffGutterClass, diffRowClass } from "@/components/app/logic/diffLineStyles";
import { DIFF_LINE_PAGE } from "@/components/app/logic/diffRenderBudget";
import { resolveMonacoLanguageId } from "@/components/app/logic/fileEditorMonaco";
import { parseDiffLines, withoutFileHeader } from "@/components/app/logic/forgePanelDiff";
import { ForgeDiffCodeLine } from "@/components/app/panels/ForgeDiffCodeLine";
import {
  reviewRemoveButtonClass,
  reviewCommentBodyClass,
  reviewCommentLabelClass,
  reviewCommentSurfaceClass,
  reviewComposerSurfaceClass,
  reviewComposerTextareaClass
} from "@/components/app/logic/reviewStyles";
import type { ResolvedTheme } from "@/components/app/types";
import type { DiffLineLimit } from "@/components/app/types/diffLine.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DiffAnnotationLineTarget } from "@shared/appTypes";
import { MessageSquarePlus, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

type AnnotatedDiffLinesProps = {
  diff: string;
  filePath: string;
  resolvedTheme: ResolvedTheme;
  /** Rendering budget for this file; lines past the limit stay unrendered until asked for. */
  lineLimit: DiffLineLimit;
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
    <div className={cn("mt-1 space-y-3 p-3", reviewComposerSurfaceClass)}>
      <div className="flex items-center gap-1.5">
        <MessageSquarePlus className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className={reviewCommentLabelClass}>Add review</span>
      </div>
      <Textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Inline review comment"
        placeholder="Write an inline comment"
        className={reviewComposerTextareaClass}
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
  <div className={cn("group/review relative mt-1", reviewCommentSurfaceClass)}>
    <div className="flex items-start gap-2 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <MessageSquarePlus className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className={reviewCommentLabelClass}>Review</span>
        </div>
        <p className={reviewCommentBodyClass}>{body || "(empty)"}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={reviewRemoveButtonClass}
        onClick={onRemove}
        aria-label="Remove inline comment"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  </div>
);

export function AnnotatedDiffLines({ diff, filePath, resolvedTheme, lineLimit, className }: AnnotatedDiffLinesProps) {
  const {
    annotationsEnabled,
    composerTarget,
    openComposer,
    closeComposer,
    addAnnotation,
    removeAnnotation,
    getAnnotationsForLine
  } = useDiffAnnotations();

  const lines = useMemo(() => withoutFileHeader(parseDiffLines(diff)), [diff]);
  const languageId = useMemo(() => resolveMonacoLanguageId(filePath), [filePath]);
  const hiddenCount = Math.max(0, lines.length - lineLimit.limit);

  const handleOpenComposer = useCallback(
    (target: DiffAnnotationLineTarget) => {
      openComposer(target);
    },
    [openComposer]
  );

  return (
    <div className={cn("font-mono text-sm leading-6", className)}>
      {lines.slice(0, lineLimit.limit).map((line, index) => {
        const inlineKey = buildDiffAnnotationKey(filePath, line.oldLine, line.newLine);
        const lineAnnotations = getAnnotationsForLine(filePath, line.oldLine, line.newLine);
        const canAnnotate = annotationsEnabled && canAnnotateDiffLine(line);
        const isComposerOpen = composerTarget?.key === inlineKey;
        const hasExtraContent = lineAnnotations.length > 0 || isComposerOpen;

        const { tone } = line;

        return (
          <div key={`${filePath}-${line.key}`}>
            {tone === "hunk" ? (
              <div className={cn("px-4 py-1", index > 0 && "mt-2", diffRowClass(tone))}>{line.text}</div>
            ) : (
            <div
              className={cn(
                "group relative grid grid-cols-[3rem_3rem_minmax(0,1fr)]",
                diffRowClass(tone),
                lineAnnotations.length > 0 && "ring-1 ring-inset ring-primary/25"
              )}
            >
              <span className={cn("select-none px-2 text-right tabular-nums", diffGutterClass(tone))} aria-hidden="true">{line.oldLine ?? ""}</span>
              <span className={cn("select-none px-2 text-right tabular-nums", diffGutterClass(tone))} aria-hidden="true">{line.newLine ?? ""}</span>
              <div className="min-w-0 whitespace-pre-wrap break-words pl-2 pr-9">
                <ForgeDiffCodeLine text={line.text} tone={tone} languageId={languageId} resolvedTheme={resolvedTheme} />
              </div>
              {canAnnotate ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute right-1.5 top-0.5 size-5 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
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
            )}

            {hasExtraContent ? <div className="space-y-1 py-1 pl-[6.5rem] pr-3">
            {lineAnnotations.map((annotation) => (
              <AnnotationCard key={annotation.id} body={annotation.body} onRemove={() => removeAnnotation(annotation.id)} />
            ))}

            {isComposerOpen && composerTarget ? (
              <InlineComposer onSave={(body) => addAnnotation(composerTarget, body)} onCancel={closeComposer} />
            ) : null}
            </div> : null}
          </div>
        );
      })}
      {hiddenCount > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border/60 px-4 py-2 font-sans text-sm text-muted-foreground">
          <span>{hiddenCount.toLocaleString()} more {hiddenCount === 1 ? "line" : "lines"} not shown</span>
          <Button variant="outline" size="sm" onClick={() => lineLimit.showMore(lines.length)}>
            Show {Math.min(hiddenCount, DIFF_LINE_PAGE).toLocaleString()} more
          </Button>
          {hiddenCount > DIFF_LINE_PAGE ? <Button variant="ghost" size="sm" onClick={() => lineLimit.showAll(lines.length)}>Show all</Button> : null}
        </div>
      ) : null}
    </div>
  );
}