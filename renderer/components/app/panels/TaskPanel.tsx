import { useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Editor from "@monaco-editor/react";
import { isAgentToolAvailable } from "@shared/agentToolState";
import { CheckCircle2, CopyPlus, Eye, FileText, LoaderCircle, PencilLine, RotateCcw, Save, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function TaskPanel() {
  const { taskPanelProps } = useAppMainCenterContent();
  if (!taskPanelProps) {
    throw new Error("TaskPanel must be rendered with taskPanelProps in AppMainCenterContent.");
  }
  const {
    projectName,
    title,
    path,
    completed,
    updatedAt,
    boardSectionTitle,
    assignedAgents,
    content,
    savedContent,
    isCreating,
    isLoading,
    isSaving,
    errorMessage,
    resolvedTheme,
    tools,
    onChange,
    onSave,
    onRevert,
    onClose,
    onSpawnAgent,
    onDuplicateToNew
  } = taskPanelProps;
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const availableTools = useMemo(() => tools.filter((tool) => isAgentToolAvailable(tool)), [tools]);
  const isDirty = content !== savedContent;
  const isBusy = isCreating || isLoading || isSaving;

  useEffect(() => {
    setMode(completed ? "preview" : "edit");
  }, [completed, path]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        event.stopPropagation();
        if (!isBusy) {
          onSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBusy, onSave]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/10">
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <FileText className="size-3.5" />
              {completed ? "Completed task" : "Workspace task"}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="truncate text-sm font-medium" title={title}>
                {title}
              </div>
              <Badge
                variant="outline"
                className={completed ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : ""}
              >
                {completed ? "Completed" : "Open"}
              </Badge>
            </div>
            <div className="mt-1 truncate text-[11px] text-muted-foreground" title={path}>
              {path}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{projectName}</Badge>
              {boardSectionTitle ? <Badge variant="outline">{boardSectionTitle}</Badge> : null}
              {updatedAt ? (
                <span className="text-[11px] text-muted-foreground">
                  Updated {new Date(updatedAt).toLocaleString()}
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {isCreating ? "Creating task..." : isLoading ? "Loading task..." : isSaving ? "Saving task..." : isDirty ? "Unsaved changes" : "Saved"}
            </div>
            {assignedAgents.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {assignedAgents.map((assignment) => (
                  <Badge
                    key={`${assignment.agentId}:${assignment.assignedAt}`}
                    variant="outline"
                    className={assignment.isActive ? "border-primary/40 bg-primary/10 text-primary" : ""}
                  >
                    {assignment.agentName}
                    {assignment.isActive ? " active" : ""}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {completed ? null : (
              <>
                <Button variant="outline" size="sm" onClick={onRevert} disabled={isBusy || !isDirty}>
                  <RotateCcw className="size-3.5" />
                  Revert
                </Button>
                <Button variant="default" size="sm" onClick={onSave} disabled={isBusy || !isDirty}>
                  {isCreating || isSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Save
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="size-3.5" />
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b border-border/50 bg-background/40 px-4 py-3">
        {completed ? (
          <div className="flex items-start gap-3 rounded-[6px] border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <div className="font-medium text-foreground">This task is completed.</div>
              <div className="mt-1 text-muted-foreground">
                Completed tasks are read-only. Duplicate this task to create a new open task for follow-up work.
              </div>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={onDuplicateToNew} disabled={isBusy}>
                  <CopyPlus className="size-3.5" />
                  Duplicate to new
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Sparkles className="size-3.5" />
              Spawn new worktree agent
            </div>
            {availableTools.map((tool) => (
              <Button
                key={tool.id}
                variant="outline"
                size="icon"
                className="size-9"
                tooltip={`Spawn a new ${tool.label} agent on a new worktree for this task`}
                aria-label={`Spawn a new ${tool.label} agent on a new worktree for this task`}
                onClick={() => onSpawnAgent(tool.id)}
                disabled={isBusy}
              >
                <AgentToolIcon
                  toolId={tool.id}
                  label={tool.label}
                  className="size-6 rounded-[4px] bg-transparent"
                  imageClassName="size-5 rounded-[4px]"
                />
              </Button>
            ))}
            {!availableTools.length ? (
              <div className="text-sm text-muted-foreground">No detected agent CLIs are available.</div>
            ) : null}
          </div>
        )}
      </div>

      {errorMessage ? (
        <div className="mx-4 mt-4 rounded-[6px] border border-destructive/35 bg-destructive/8 px-4 py-3 text-sm text-foreground">
          {errorMessage}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 px-4 pb-4 pt-3">
        <Tabs value={mode} onValueChange={(value) => setMode(value === "edit" ? "edit" : "preview")} className="flex h-full min-h-0 flex-col">
          <div className="mb-3">
            <TabsList>
              <TabsTrigger value="preview" className="inline-flex min-w-fit items-center gap-1.5 whitespace-nowrap">
                <Eye className="size-3.5" />
                Preview
              </TabsTrigger>
              <TabsTrigger
                value="edit"
                disabled={completed}
                className="inline-flex min-w-fit items-center gap-1.5 whitespace-nowrap"
              >
                <PencilLine className="size-3.5" />
                Edit
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="preview" className="min-h-0 flex-1">
            <div className="h-full min-h-0 overflow-auto rounded-[6px] border border-border/60 bg-background px-6 py-5">
              {isLoading ? (
                <div className="flex h-full items-center justify-center gap-3 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Loading task contents...
                </div>
              ) : (
                <div className="space-y-3">
                  {isCreating ? (
                    <div className="inline-flex items-center gap-2 rounded-[6px] border border-primary/25 bg-primary/8 px-3 py-2 text-xs text-muted-foreground">
                      <LoaderCircle className="size-3.5 animate-spin text-primary" />
                      Creating task file...
                    </div>
                  ) : null}
                  <div className="space-y-4">
                    <MarkdownRenderer>
                      {content}
                    </MarkdownRenderer>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="edit" className="min-h-0 flex-1">
            <div className="h-full min-h-0 overflow-hidden rounded-[6px] border border-border/60 bg-background">
              {isLoading ? (
                <div className="flex h-full items-center justify-center gap-3 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Loading task editor...
                </div>
              ) : (
                <Editor
                  path={path}
                  language="markdown"
                  value={content}
                  theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
                  onChange={(value) => onChange(value ?? "")}
                  options={{
                    automaticLayout: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    readOnly: completed || isCreating,
                    padding: { top: 16, bottom: 16 },
                    renderLineHighlight: "gutter",
                    tabSize: 2
                  }}
                  loading={
                    <div className="flex h-full items-center justify-center gap-3 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      Loading editor...
                    </div>
                  }
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
