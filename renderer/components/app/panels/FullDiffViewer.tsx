import { diffLineClass } from "@/components/app/logic/utils";
import type { ResolvedTheme } from "@/components/app/types";
import { cn } from "@/lib/utils";
import type { ChangeEntry } from "@shared/appTypes";

function changeTone(status: ChangeEntry["status"]): string {
  switch (status) {
    case "added":
      return "text-emerald-500";
    case "deleted":
      return "text-destructive";
    case "modified":
      return "text-primary";
    case "renamed":
    case "copied":
      return "text-amber-500";
    default:
      return "text-muted-foreground";
  }
}

export function FullDiffViewer({
  changes,
  resolvedTheme
}: {
  changes: ChangeEntry[];
  resolvedTheme: ResolvedTheme;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="terminal-text h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden text-[12px] leading-6">
        {changes.map((change) => (
          <section key={change.path} className="border-b border-border/40 last:border-b-0">
            <div className="sticky top-0 z-10 border-y border-border/60 bg-background/95 px-4 py-2 backdrop-blur">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="truncate text-sm font-bold text-foreground" title={change.path}>{change.path}</div>
                <div className="flex shrink-0 items-center gap-3 text-[11px] font-bold">
                  <span className={cn("uppercase tracking-[0.12em]", changeTone(change.status))}>{change.status}</span>
                  <span className="text-emerald-500">+{change.additions}</span>
                  <span className="text-destructive">-{change.deletions}</span>
                </div>
              </div>
            </div>
            <div className="p-4">
              {change.diff.split("\n").map((line, index) => (
                <div key={`${change.path}-${index}-${line}`} className={cn("whitespace-pre-wrap break-words px-2", diffLineClass(line, resolvedTheme))}>
                  {line || " "}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
