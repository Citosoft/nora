import { WorkflowRunStatusIcon } from "@/components/app/dialogs/workflow-run/WorkflowRunStatusIcon";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { WorkflowResultBlockProps, WorkflowRunOutputProps } from "@/components/app/types/loopRunPresentation.types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, CircleAlert, GitPullRequestArrow, RotateCcw, TerminalSquare } from "lucide-react";

const OUTCOME_COPY = {
  continue: "Continue",
  complete: "Complete",
  approve: "Approved",
  changes_requested: "Changes requested"
} as const;

function WorkflowResultBlock({ segment }: WorkflowResultBlockProps) {
  const accepted = segment.outcome === "complete" || segment.outcome === "approve";
  const status = segment.complete ? (accepted ? "complete" : "paused") : "active";
  const OutcomeIcon = accepted ? CheckCircle2 : segment.outcome === "changes_requested" ? GitPullRequestArrow : RotateCcw;

  return (
    <section className={cn(
      "rounded-lg border p-4",
      accepted ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-amber-500/25 bg-amber-500/[0.05]"
    )}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {segment.complete ? <OutcomeIcon className={cn("size-4", accepted ? "text-emerald-500" : "text-amber-500")} aria-hidden="true" /> : <WorkflowRunStatusIcon status={status} />}
          <span className="text-sm font-semibold">Workflow result</span>
        </div>
        <Badge variant={accepted ? "success" : "warning"}>{segment.complete ? OUTCOME_COPY[segment.outcome] : "Receiving result"}</Badge>
      </div>
      {segment.summary ? <MarkdownRenderer className="min-w-0" >{segment.summary}</MarkdownRenderer> : (
        <p className="text-sm text-muted-foreground">Waiting for the agent summary…</p>
      )}
    </section>
  );
}

function tokenCount(value: number | null): string {
  return value === null ? "unknown" : new Intl.NumberFormat().format(value);
}

export function WorkflowRunOutput({ segments, isActive, scrollRef }: WorkflowRunOutputProps) {
  return (
    <section className="flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Live output</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Agent messages and workflow results appear as they arrive</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isActive ? <WorkflowRunStatusIcon status="active" /> : null}
          {isActive ? "Streaming" : "Output saved"}
        </div>
      </div>
      <div ref={scrollRef} aria-live="polite" aria-busy={isActive} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {segments.length > 0 ? segments.map((segment) => {
          switch (segment.kind) {
            case "result":
              return <WorkflowResultBlock key={segment.id} segment={segment} />;
            case "markdown":
              return <MarkdownRenderer key={segment.id} className="min-w-0 break-words">{segment.markdown}</MarkdownRenderer>;
            case "turn":
              return (
                <div key={segment.id} className="flex items-center gap-3 border-b border-border/70 pb-3">
                  <AgentToolIcon toolId={segment.toolId} label={segment.roleName} className="size-8" imageClassName="size-5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{segment.roleName}</p>
                    <p className="text-xs text-muted-foreground">{segment.roleKind === "writer" ? "Implementing" : "Reviewing"} · iteration {segment.iteration}</p>
                  </div>
                  <WorkflowRunStatusIcon status={segment.phase === "finished" ? segment.aborted || (segment.exitCode !== null && segment.exitCode !== 0) ? "error" : "complete" : "active"} />
                </div>
              );
            case "tool":
              return (
                <details key={segment.id} className={cn("group rounded-lg border", segment.status === "failed" ? "border-destructive/30 bg-destructive/[0.04]" : "border-border bg-muted/20")}>
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm">
                    <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
                    <TerminalSquare className="size-4 shrink-0 text-muted-foreground" />
                    <code className="min-w-0 flex-1 truncate text-xs">{segment.command || "Agent tool"}</code>
                    {segment.status === "failed" ? <CircleAlert className="size-4 text-destructive" /> : <CheckCircle2 className="size-4 text-emerald-500" />}
                  </summary>
                  {segment.output ? <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-border px-3 py-3 text-xs leading-5 text-muted-foreground">{segment.output}</pre> : null}
                </details>
              );
            case "notice":
              return (
                <div key={segment.id} className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-xs", segment.tone === "warning" ? "border-amber-500/25 bg-amber-500/[0.05] text-amber-700 dark:text-amber-300" : "border-border bg-muted/25 text-muted-foreground")}>
                  {segment.tone === "warning" ? <CircleAlert className="size-4 shrink-0" /> : <WorkflowRunStatusIcon status={isActive ? "active" : "complete"} />}
                  <span>{segment.message}</span>
                </div>
              );
            case "usage":
              return (
                <p key={segment.id} className="text-right text-[11px] text-muted-foreground">
                  {tokenCount(segment.inputTokens)} input · {tokenCount(segment.outputTokens)} output tokens
                  {segment.cachedInputTokens ? ` · ${tokenCount(segment.cachedInputTokens)} cached` : ""}
                </p>
              );
          }
        }) : (
          <div className="grid min-h-52 place-items-center text-center">
            <div className="space-y-3">
              {isActive ? <WorkflowRunStatusIcon status="active" className="mx-auto size-6" /> : null}
              <div>
                <p className="text-sm font-medium">{isActive ? "Waiting for workflow output" : "No output was recorded"}</p>
                {isActive ? <p className="mt-1 text-xs text-muted-foreground">The first agent message will appear here.</p> : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
