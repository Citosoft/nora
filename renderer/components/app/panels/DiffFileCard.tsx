import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useOptionalDiffAnnotations } from "@/components/app/context/diffAnnotationContext";
import { useDiffLineLimit } from "@/components/app/hooks/useDiffLineLimit";
import { useNearScrollViewport } from "@/components/app/hooks/useNearScrollViewport";
import { DIFF_RENDER_MARGIN, estimateDiffBodyHeight } from "@/components/app/logic/diffRenderBudget";
import { DiffCounts } from "@/components/app/panels/conversations/DiffCounts";
import { AnnotatedDiffLines } from "@/components/app/panels/diff-annotation/AnnotatedDiffLines";
import { ChangeStatusBadge } from "@/components/app/shared/ChangeStatusBadge";
import { FilePathLabel } from "@/components/app/shared/FilePathLabel";
import type { DiffFileCardProps } from "@/components/app/types/centerDiff.types";
import { cn } from "@/lib/utils";

/**
 * One file in the full-diff viewer: a sticky, collapsible header over its annotated diff lines. Lines render only
 * while the card is near the visible area; elsewhere a placeholder of the last measured height keeps the scroll
 * position stable, so a diff with many files holds just a few files' rows at a time.
 */
export function DiffFileCard({ change, resolvedTheme, scrollRoot }: DiffFileCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const bodyId = useId();
  const lineLimit = useDiffLineLimit(change.path);
  const { ref, near } = useNearScrollViewport<HTMLElement>(scrollRoot, DIFF_RENDER_MARGIN);
  // An open inline comment keeps its file rendered so a draft is never lost to scrolling.
  const composing = useOptionalDiffAnnotations()?.composerTarget?.path === change.path;
  const rendered = near || composing;
  const bodyRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<{ diff: string; limit: number; height: number } | null>(null);
  const estimate = useMemo(() => estimateDiffBodyHeight(change.diff), [change.diff]);
  const placeholderHeight = measured?.diff === change.diff && measured.limit === lineLimit.limit ? measured.height : estimate;

  useEffect(() => {
    const body = bodyRef.current;
    if (!rendered || !body) return;
    const observer = new ResizeObserver(() => setMeasured({ diff: change.diff, limit: lineLimit.limit, height: body.offsetHeight }));
    observer.observe(body);
    return () => observer.disconnect();
  }, [rendered, collapsed, change.diff, lineLimit.limit]);

  return <section ref={ref} data-diff-path={change.path} aria-label={change.path} className="scroll-mt-4 rounded-lg border border-border bg-card/50">
    <header className={cn("sticky top-0 z-10 flex items-center gap-3 rounded-t-lg border-border bg-card/95 px-3 py-2.5 text-sm backdrop-blur", collapsed ? "rounded-b-lg" : "border-b")}>
      <button type="button" aria-expanded={!collapsed} aria-controls={bodyId} aria-label={`${collapsed ? "Expand" : "Collapse"} ${change.path}`}
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setCollapsed((current) => !current)}>
        <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90")} aria-hidden="true" />
      </button>
      <FilePathLabel path={change.path} className="flex-1 font-medium" />
      <ChangeStatusBadge status={change.status} />
      <DiffCounts counts={{ additions: change.additions, deletions: change.deletions }} />
    </header>
    {!collapsed && (rendered
      ? <div ref={bodyRef} id={bodyId} className="overflow-hidden rounded-b-lg py-1">
        <AnnotatedDiffLines diff={change.diff} filePath={change.path} resolvedTheme={resolvedTheme} lineLimit={lineLimit} />
      </div>
      : <div id={bodyId} aria-busy="true" style={{ height: placeholderHeight }} />)}
  </section>;
}
