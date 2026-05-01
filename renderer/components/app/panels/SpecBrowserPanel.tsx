import type { SpecBrowserPanelProps } from "@/components/app/types/component.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderKanban, Info, LoaderCircle, Plus, ScrollText, Trash2, X } from "lucide-react";

export function SpecBrowserPanel({
  workspaces,
  isCreatingSpec,
  onOpenSpec,
  onCreateSpec,
  onDeleteSpec,
  onGenerateTasksFromSpec,
  onClose
}: SpecBrowserPanelProps) {
  const totalSpecCount = workspaces.reduce((total, workspace) => total + workspace.specs.length, 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border/60 px-6 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <ScrollText className="size-4 shrink-0" />
            Spec Center
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Close specs browser">
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">{totalSpecCount} specs</Badge>
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
                  <div className="text-sm font-semibold text-foreground">Use specs as the source of truth for larger work</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Specs are lightweight Markdown documents for capturing requirements, constraints, and implementation intent before work is broken down.
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <div>Create a spec when you want a stable written brief for a feature, refactor, or project.</div>
                    <div>Use the spec to clarify scope, edge cases, and success criteria before creating tasks.</div>
                    <div>Use <span className="font-medium text-foreground">Generate tasks</span> on a spec to ask the agent to turn that document into actionable task files.</div>
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
                      <Badge variant="outline">{workspace.specs.length} specs</Badge>
                      <Button variant="outline" size="sm" onClick={() => onCreateSpec(workspace.projectId)} disabled={isCreatingSpec}>
                        {isCreatingSpec ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                        Spec
                      </Button>
                    </div>
                  </div>
                  {workspace.errorMessage ? (
                    <div className="mt-3 text-sm text-destructive">{workspace.errorMessage}</div>
                  ) : null}
                </div>
                <div className="px-5 py-4">
                  {workspace.isLoading ? (
                    <div className="text-sm text-muted-foreground">Loading workspace specs…</div>
                  ) : workspace.specs.length ? (
                    <div className="space-y-2">
                      {workspace.specs.map((spec) => (
                        <div
                          key={spec.path}
                          className="flex items-center gap-3 rounded-[4px] border border-border/60 bg-background/30 px-3 py-3"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenSpec(workspace.projectId, spec.path)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <ScrollText className="size-4 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-foreground">{spec.title}</div>
                              <div className="truncate text-xs text-muted-foreground">{spec.path}</div>
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => onGenerateTasksFromSpec(workspace.projectId, spec.path)}>
                              <FolderKanban className="size-4" />
                              Generate tasks
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => {
                                void onDeleteSpec(workspace.projectId, spec.path);
                              }}
                              aria-label={`Delete ${spec.title}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[4px] border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                      No specs yet for this workspace.
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="rounded-[4px] border border-dashed border-border/70 bg-background/40 px-6 py-8 text-sm text-muted-foreground">
              Add a repository to start organizing specs by workspace.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
