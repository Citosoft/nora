import {
  browserReviewComposerSurfaceClass,
  browserReviewComposerTextareaClass
} from "@/components/app/panels/browser-annotation/browserAnnotationUi";
import type { BrowserAnnotationComposerTarget } from "@/components/app/types/browserAnnotationContext.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type BrowserCommentComposerProps = {
  target: BrowserAnnotationComposerTarget;
  onSave: (body: string) => void;
  onCancel: () => void;
  disabled?: boolean;
};

const formatElementSummary = (target: BrowserAnnotationComposerTarget): string => {
  const tag = target.tagName.toLowerCase();
  const id = target.attributes.id?.trim();
  if (id) {
    return `${tag}#${id}`;
  }

  const testId = target.attributes["data-testid"]?.trim();
  if (testId) {
    return `${tag}[data-testid="${testId}"]`;
  }

  return tag;
};

export function BrowserCommentComposer({ target, onSave, onCancel, disabled = false }: BrowserCommentComposerProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [target.key]);

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
    <div className="absolute inset-x-4 bottom-4 z-20 max-w-xl">
      <div className={browserReviewComposerSurfaceClass}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              <MessageSquarePlus className="size-3.5" />
              <span>Add page comment</span>
            </div>
            <div className="truncate text-sm font-medium text-foreground" title={formatElementSummary(target)}>
              {formatElementSummary(target)}
            </div>
            {target.textPreview ? (
              <div className="line-clamp-2 text-xs text-muted-foreground" title={target.textPreview}>
                {target.textPreview}
              </div>
            ) : null}
            <div className="truncate text-[11px] text-muted-foreground" title={target.pageUrl}>
              {target.pageTitle || target.pageUrl}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={onCancel}
            disabled={disabled}
            aria-label="Close comment composer"
          >
            <X className="size-4" />
          </Button>
        </div>
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what should change about this element"
          className={browserReviewComposerTextareaClass}
          disabled={disabled}
        />
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={disabled}>
            Cancel
          </Button>
          <Button
            variant="default"
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
    </div>
  );
}
