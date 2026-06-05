import {
  diffReviewCommentAccentClass,
  diffReviewCommentLabelClass,
  diffReviewCommentSurfaceClass
} from "@/components/app/panels/diff-annotation/diffAnnotationUi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, Plus, Send } from "lucide-react";

export type DiffAnnotationIntroDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DiffAnnotationPreview() {
  return (
    <div className="overflow-hidden rounded-[6px] border border-border/70 bg-background/70 text-[12px] shadow-sm">
      <div className="border-b border-border/60 bg-muted/35 px-3 py-2">
        <div className="truncate text-xs font-medium text-foreground">renderer/components/app/panels/DiffViewer.tsx</div>
      </div>
      <div className="terminal-text space-y-1 p-3 font-mono text-[12px] leading-6">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 whitespace-pre-wrap rounded-[4px] bg-emerald-500/10 px-2 text-emerald-600">
            + const canAnnotate = annotationsEnabled &amp;&amp; canAnnotateDiffLine(line);
          </div>
          <div className="flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-primary/35 bg-primary/10 text-primary">
            <Plus className="size-3.5" />
          </div>
        </div>
        <div className={cn("relative ml-0 mt-1", diffReviewCommentSurfaceClass)}>
          <div className={diffReviewCommentAccentClass} aria-hidden="true" />
          <div className="flex items-start gap-2 px-3 py-2.5 pl-3.5 font-sans">
            <MessageSquarePlus className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className={diffReviewCommentLabelClass}>Review</div>
              <div className="mt-1 text-sm leading-5 text-foreground">
                Ask the agent to extract this into a helper before merging.
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-[4px] border border-border/50 bg-muted/25 px-3 py-2 font-sans text-xs text-muted-foreground">
          <Send className="size-3.5 text-primary" />
          <span>Queued comments appear in the Diff review tray and can be sent to an agent together.</span>
        </div>
      </div>
    </div>
  );
}

export function DiffAnnotationIntroDialog({ open, onOpenChange }: DiffAnnotationIntroDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle="Review diffs with inline notes"
        className="max-w-[640px]"
      >
        <DialogHeader>
          <DialogDescription>
            Hover a changed line, add a comment, then send the collected review notes to a running agent from the Changes panel.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <DiffAnnotationPreview />
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-[4px] border border-border/60 bg-background/45 p-3">
              <div className="mb-1 font-medium text-foreground">1. Pick a line</div>
              Use the plus button that appears beside changed diff lines.
            </div>
            <div className="rounded-[4px] border border-border/60 bg-background/45 p-3">
              <div className="mb-1 font-medium text-foreground">2. Add context</div>
              Write the change you want, then press Add comment.
            </div>
            <div className="rounded-[4px] border border-border/60 bg-background/45 p-3">
              <div className="mb-1 font-medium text-foreground">3. Send review</div>
              Use the Diff review tray to hand all comments to an agent.
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
