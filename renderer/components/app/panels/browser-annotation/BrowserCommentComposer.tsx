import {
  reviewComposerSurfaceClass,
  reviewComposerTextareaClass
} from "@/components/app/logic/reviewStyles";
import { formatBrowserElementLabel } from "@/components/app/logic/browserAnnotation";
import type { BrowserCommentComposerProps } from "@/components/app/types/browserAnnotationContext.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export function BrowserCommentComposer({ target, onSave, onCancel, disabled = false }: BrowserCommentComposerProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [target.key]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
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
    <div className="absolute inset-x-3 bottom-3 z-20 max-h-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-lg">
      <div className={reviewComposerSurfaceClass}>
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <MessageSquarePlus className="size-3.5" aria-hidden="true" />
              <span>Add page comment</span>
            </div>
            <div className="truncate font-mono text-xs text-foreground" title={formatBrowserElementLabel(target)}>
              {formatBrowserElementLabel(target)}
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
            className="size-7 shrink-0 text-muted-foreground"
            onClick={onCancel}
            disabled={disabled}
            aria-label="Close comment composer"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="px-4 py-3">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Page comment"
            placeholder="Describe what should change about this element"
            className={reviewComposerTextareaClass}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-4 py-3">
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
