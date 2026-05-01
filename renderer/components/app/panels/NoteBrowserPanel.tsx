import type { NoteBrowserPanelProps } from "@/components/app/types/component.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, LoaderCircle, Plus, StickyNote, Trash2, X } from "lucide-react";

export function NoteBrowserPanel({
  workspaces,
  isCreatingNote,
  onOpenNote,
  onCreateNote,
  onDeleteNote,
  onClose
}: NoteBrowserPanelProps) {
  const totalNoteCount = workspaces.reduce((total, workspace) => total + workspace.notes.length, 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border/60 px-6 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <StickyNote className="size-4 shrink-0" />
            Notes Center
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Close notes browser">
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">{totalNoteCount} notes</Badge>
        </div>
      </div>
      <ScrollArea className="h-full px-6 py-5">
        <div className="space-y-5">
          <Card className="border-primary/20 bg-primary/5">
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-[4px] border border-primary/20 bg-background/80 p-2 text-primary">
                  <Info className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">Capture thoughts without affecting workflows</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Notes live under <span className="font-mono text-xs">.nora/notes</span> as ordinary Markdown files. They are for your reference only.
                  </div>
                </div>
              </div>
            </div>
          </Card>
          {workspaces.length ? (
            workspaces.map((workspace) => (
              <Card key={workspace.projectId} className="overflow-hidden">
                <div className="border-b border-border/60 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-foreground">{workspace.projectName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{workspace.projectRootPath}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{workspace.notes.length} notes</Badge>
                      <Button variant="outline" size="sm" onClick={() => onCreateNote(workspace.projectId)} disabled={isCreatingNote}>
                        {isCreatingNote ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                        Note
                      </Button>
                    </div>
                  </div>
                  {workspace.errorMessage ? (
                    <div className="mt-3 text-sm text-destructive">{workspace.errorMessage}</div>
                  ) : null}
                </div>
                <div className="px-5 py-4">
                  {workspace.isLoading ? (
                    <div className="text-sm text-muted-foreground">Loading workspace notes…</div>
                  ) : workspace.notes.length ? (
                    <div className="space-y-2">
                      {workspace.notes.map((note) => (
                        <div
                          key={note.path}
                          className="flex items-center gap-3 rounded-[4px] border border-border/60 bg-background/30 px-3 py-3"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenNote(workspace.projectId, note.path)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <StickyNote className="size-4 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-foreground">{note.title}</div>
                              <div className="truncate text-xs text-muted-foreground">{note.path}</div>
                            </div>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              void onDeleteNote(workspace.projectId, note.path);
                            }}
                            aria-label={`Delete ${note.title}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[4px] border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                      No notes yet for this workspace.
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="rounded-[4px] border border-dashed border-border/70 bg-background/40 px-6 py-8 text-sm text-muted-foreground">
              Add a repository to keep notes per workspace.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
