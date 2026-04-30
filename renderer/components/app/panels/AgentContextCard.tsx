import type { AgentContextCardProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText, LoaderCircle } from "lucide-react";

export function AgentContextCard({
  state,
  loading,
  clearing,
  onClear,
  onCopyReference,
  onClose,
  layout = "inline"
}: AgentContextCardProps) {
  const bundleEntries = state?.entries.filter((entry) => entry.kind === "context-bundle") ?? [];
  const timelineEntries = state?.entries.filter((entry) => entry.kind !== "context-bundle") ?? [];

  return (
    <div
      className={
        layout === "modal"
          ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[4px] border border-border/70 bg-background/70"
          : "flex min-h-0 max-h-[32vh] flex-col overflow-hidden rounded-[4px] border border-border/70 bg-background/70"
      }
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="size-4 text-primary" />
            <span>Tracked context</span>
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {state?.contextFilePath || "Loading context file..."}
          </div>
          {state ? (
            <div className="mt-1 text-[11px] text-muted-foreground">
              {state.entries.length} entr{state.entries.length === 1 ? "y" : "ies"} · {state.estimate.characters.toLocaleString()} chars · ~{state.estimate.estimatedTokens.toLocaleString()} tokens
            </div>
          ) : null}
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
        {loading && !state ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin text-primary" />
            Loading context preview
          </div>
        ) : (
          <div className="space-y-3">
            {bundleEntries.length ? (
              <div className="rounded-[4px] border border-primary/20 bg-primary/10 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">Saved Bundles</div>
                <div className="space-y-2">
                  {bundleEntries.map((entry) => {
                    const bundleReference = entry.references.find((reference) => reference.kind === "bundle-file");
                    return (
                      <div key={`bundle-${entry.id}`} className="flex items-center justify-between gap-3 rounded-[4px] border border-border/50 bg-background/20 px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-100">{entry.title}</div>
                          <div className="truncate text-xs text-slate-300">{bundleReference?.value || entry.content}</div>
                        </div>
                        {bundleReference ? (
                          <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => onCopyReference(bundleReference.value)}>
                            Copy Path
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {timelineEntries.length ? timelineEntries.slice().reverse().map((entry) => (
              <div key={entry.id} className="rounded-[4px] border border-border/60 bg-background/20 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium text-slate-100">{entry.title}</div>
                  <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                    {entry.precision}
                  </span>
                  <span className="text-[11px] text-slate-400">{entry.kind}</span>
                  <span className="text-[11px] text-slate-400">~{entry.estimate.estimatedTokens.toLocaleString()} tok</span>
                </div>
                {entry.references.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {entry.references.map((reference) => (
                      <div key={`${entry.id}-${reference.label}-${reference.value}`} className="flex items-center justify-between gap-3 rounded-[4px] bg-background/20 px-2 py-1 text-[11px] text-slate-300">
                        <span className="min-w-0 truncate">{reference.label}: {reference.value}</span>
                        {(reference.kind === "bundle-file" || reference.kind === "workspace-path") ? (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onCopyReference(reference.value)}>
                            Copy
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                <pre className="terminal-text mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-200">
                  {entry.content}
                </pre>
              </div>
            )) : bundleEntries.length ? null : (
              <pre className="terminal-text whitespace-pre-wrap break-words text-xs leading-6 text-slate-200">
                No tracked context yet.
              </pre>
            )}
          </div>
        )}
      </div>
      {state ? (
        <div className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
          Raw stream: {state.terminalStreamPath} · Events: {state.contextEventsPath}
        </div>
      ) : null}
    </div>
  );
}
