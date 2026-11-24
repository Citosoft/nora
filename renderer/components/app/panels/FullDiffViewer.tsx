import { useEffect, useRef, useState } from "react";
import { DiffAnnotationIntroDialog } from "@/components/app/dialogs/DiffAnnotationIntroDialog";
import { useDiffAnnotationIntroDialog } from "@/components/app/hooks/useDiffAnnotationIntroDialog";
import { DiffFileCard } from "@/components/app/panels/DiffFileCard";
import type { DiffFileFocus, FullDiffViewerProps } from "@/components/app/types/centerDiff.types";
import type { ChangeEntry } from "@shared/appTypes";

/** Scrolls to the focused file once per focus request, waiting for it to appear if the changes are still loading. */
function useScrollToFocusedFile(scroller: HTMLElement | null, changes: ChangeEntry[], focus: DiffFileFocus | null) {
  const handled = useRef<DiffFileFocus | null>(null);
  useEffect(() => {
    if (!focus || handled.current === focus) return;
    const section = scroller?.querySelector(`[data-diff-path="${CSS.escape(focus.path)}"]`);
    if (!section) return;
    handled.current = focus;
    section.scrollIntoView({ block: "start" });
  }, [scroller, changes, focus]);
}

export function FullDiffViewer({ changes, resolvedTheme, focus = null }: FullDiffViewerProps) {
  const diffAnnotationIntroDialog = useDiffAnnotationIntroDialog();
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  useScrollToFocusedFile(scroller, changes, focus);
  const focusMissing = focus !== null && !changes.some((change) => change.path === focus.path);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DiffAnnotationIntroDialog {...diffAnnotationIntroDialog} />
      {focusMissing && <p role="status" className="shrink-0 border-b border-border/60 px-4 py-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{focus.path}</span> has no uncommitted changes in this workspace.</p>}
      <div ref={setScroller} className="h-full min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-4">
        {changes.map((change) => <DiffFileCard key={change.path} change={change} resolvedTheme={resolvedTheme} scrollRoot={scroller} />)}
      </div>
    </div>
  );
}
