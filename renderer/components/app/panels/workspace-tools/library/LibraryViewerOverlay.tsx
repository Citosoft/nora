import type { KeyboardEvent } from "react";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, X } from "lucide-react";
import { resolveWorkspaceFileViewKind } from "@shared/workspaceFileViewKind";
import { WorkspaceFileIcon } from "@/lib/WorkspaceFileIcon";
import { useWorkspaceSessionPanelActions, useWorkspaceSessionPanelData } from "@/components/app/context/workspaceSessionPanelContext";
import { FileEditorPanel } from "@/components/app/panels/FileEditorPanel";
import type { LibraryViewerOverlayProps } from "@/components/app/types/library.types";
import { Button } from "@/components/ui/button";

/** Arrow keys step through outputs unless the user is typing or moving a caret. */
function isEditing(target: EventTarget): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || !!target.closest("input, textarea, select, .monaco-editor"));
}

/** One output, viewed over the Library grid, with previous and next to step through what the grid shows. */
export function LibraryViewerOverlay({ entry, state, position, host, onPrevious, onNext, onClose }: LibraryViewerOverlayProps) {
  const { fileEditorState } = useWorkspaceSessionPanelData();
  const actions = useWorkspaceSessionPanelActions();
  const [systemError, setSystemError] = useState<string | null>(null);
  const tab = state.status === "viewer" ? fileEditorState?.tabs.find((candidate) => candidate.path === state.path) ?? null : null;
  const hasPrevious = position.index > 0;
  const hasNext = position.index >= 0 && position.index < position.total - 1;
  const onKeyDown = (event: KeyboardEvent): void => {
    if (isEditing(event.target)) return;
    if (event.key === "ArrowLeft" && hasPrevious) { event.preventDefault(); onPrevious(); }
    if (event.key === "ArrowRight" && hasNext) { event.preventDefault(); onNext(); }
  };
  const openWithSystem = (): void => {
    setSystemError(null);
    host.openWithSystem(entry.itemId, entry.path).catch((error: unknown) => setSystemError(error instanceof Error ? error.message : `${entry.name} could not be opened.`));
  };
  const opensInApp = resolveWorkspaceFileViewKind(entry.path) === "external";
  const subtitle = [entry.threadTitle, new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }), entry.path].join(" · ");
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/75 backdrop-blur-sm library-overlay-in" />
      <Dialog.Content onKeyDown={onKeyDown} aria-describedby={undefined}
        className="fixed left-1/2 top-1/2 z-[30001] flex h-[min(88vh,960px)] w-[min(1240px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-card shadow-panel outline-none library-viewer-in">
        <header className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3">
          <WorkspaceFileIcon path={entry.name} className="size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <Dialog.Title className="truncate text-sm font-semibold">{entry.name}</Dialog.Title>
            <p className="truncate text-xs text-muted-foreground" title={subtitle}>{subtitle}</p>
          </div>
          {position.index >= 0 && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{position.index + 1} of {position.total}</span>}
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Previous output" tooltip="Previous (←)" disabled={!hasPrevious} onClick={onPrevious}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Next output" tooltip="Next (→)" disabled={!hasNext} onClick={onNext}><ChevronRight className="size-4" aria-hidden="true" /></Button>
            <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Close viewer"><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          {state.status === "loading" || (state.status === "viewer" && !tab)
            ? <p role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />Opening {entry.name}…</p>
            : state.status === "viewer" && tab
            ? <FileEditorPanel tabs={[tab]} activePath={tab.path} title="Library" onSelectTab={() => {}}
              onChange={(content) => actions.onChangeFileEditorTabContent(tab.path, content)}
              onSave={() => actions.onSaveFileEditorTab(tab.path)} onRevert={() => actions.onRevertFileEditorTab(tab.path)}
              onClose={onClose} onCloseTab={onClose} onOpenFileEditor={actions.onOpenFileEditor} onGenerateTasks={null} />
            : <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="flex size-20 items-center justify-center rounded-2xl bg-muted"><WorkspaceFileIcon path={entry.name} className="size-10" /></span>
              <p className="max-w-sm text-sm text-muted-foreground">{state.status === "unavailable" ? state.message : `Nora can't preview ${entry.name}.`}</p>
              {state.status === "unsupported" && <Button type="button" variant="outline" onClick={openWithSystem}>
                <ExternalLink className="size-4" aria-hidden="true" />{opensInApp ? "Open in default app" : "Show in file manager"}</Button>}
              {systemError && <p role="alert" className="text-xs text-destructive">{systemError}</p>}
            </div>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
