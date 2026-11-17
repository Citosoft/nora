import { Sparkles } from "lucide-react";
import type { CommitComposerProps } from "@/components/app/types/changesPanelSections.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Commit message card in the style of the thread composer: message above, actions in a footer row. */
export function CommitComposer({ message, committing, canCommit, selectionLabel, ai, actions, notice, onMessageChange, onCommit }: CommitComposerProps) {
  return <div className="space-y-2">
    <div className="rounded-xl border border-border/70 bg-background/60 transition-colors focus-within:border-ring/50">
      <Textarea variant="embedded" rows={2} value={message} aria-label="Commit message" placeholder="Commit message"
        className="min-h-[3.25rem] resize-none px-3 pb-1 pt-2.5 text-[12.5px]"
        onChange={(event) => onMessageChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); onCommit(); }
        }} />
      <div className="flex min-w-0 items-center gap-0.5 px-1.5 pb-1.5">
        {ai && <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-foreground" disabled={ai.disabled || ai.generating}
          onClick={ai.onGenerate} tooltip={ai.generating ? "Writing commit message…" : "Write commit message with AI"} aria-label="Write commit message with AI">
          <Sparkles className={`size-3.5 ${ai.generating ? "animate-pulse" : ""}`} aria-hidden="true" />
        </Button>}
        <span className="min-w-0 flex-1 truncate px-1 text-[11px] text-muted-foreground">{selectionLabel}</span>
        {actions}
        <Button type="button" size="sm" className="ml-1 h-7 shrink-0 px-3 text-xs" disabled={!canCommit || committing} onClick={onCommit} tooltip="Commit (⌘↵)">
          {committing ? "Committing…" : "Commit"}
        </Button>
      </div>
    </div>
    {notice}
  </div>;
}
