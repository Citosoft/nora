import type { AgentContextCardProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText, LoaderCircle } from "lucide-react";

export function AgentContextCard({
  preview,
  loading,
  clearing,
  onClear,
  onClose
}: AgentContextCardProps) {
  return (
    <div className="flex min-h-0 max-h-[32vh] flex-col overflow-hidden rounded-[4px] border border-border/70 bg-background/70">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="size-4 text-primary" />
            <span>Persisted context</span>
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {preview?.contextFilePath || "Loading context file..."}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={onClear}
            disabled={clearing}
          >
            {clearing ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
            Clear
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Hide context preview">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-black/40 p-4">
        {loading && !preview ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin text-primary" />
            Loading context preview
          </div>
        ) : (
          <pre className="terminal-text whitespace-pre-wrap break-words text-xs leading-6 text-slate-200">
            {preview?.content || "No persisted context yet."}
          </pre>
        )}
      </div>
      {preview ? (
        <div className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
          Raw stream: {preview.terminalStreamPath}
        </div>
      ) : null}
    </div>
  );
}
