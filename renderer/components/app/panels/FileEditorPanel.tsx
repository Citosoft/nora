import {
  useWorkspaceSessionPanelActions,
  useWorkspaceSessionPanelData
} from "@/components/app/context/workspaceSessionPanelContext";
import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import { useSessionCenterPorts } from "@/components/app/hooks/useSessionCenterPorts";
import { sendAgentTerminalText } from "@/components/app/logic/agentHandoff";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import type { FileEditorPanelProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { OnMount } from "@monaco-editor/react";
import Editor from "@monaco-editor/react";
import { AlertCircle, Eye, FolderKanban, Image as ImageIcon, LoaderCircle, PencilLine, RotateCcw, Save, SquarePen, X } from "lucide-react";
import type { editor } from "monaco-editor";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type FileEditorPanelContextProps = Partial<FileEditorPanelProps>;

function getMonacoLanguage(pathName: string): string {
  const normalized = pathName.toLowerCase();
  if (normalized.endsWith(".ts") || normalized.endsWith(".tsx")) return "typescript";
  if (normalized.endsWith(".js") || normalized.endsWith(".jsx") || normalized.endsWith(".mjs") || normalized.endsWith(".cjs")) return "javascript";
  if (normalized.endsWith(".json")) return "json";
  if (normalized.endsWith(".css")) return "css";
  if (normalized.endsWith(".scss")) return "scss";
  if (normalized.endsWith(".html")) return "html";
  if (normalized.endsWith(".md") || normalized.endsWith(".markdown")) return "markdown";
  if (normalized.endsWith(".yml") || normalized.endsWith(".yaml")) return "yaml";
  if (normalized.endsWith(".sh")) return "shell";
  return "plaintext";
}

function getFileName(pathName: string): string {
  const normalized = pathName.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || pathName;
}

function getMultiSelectionText(ed: editor.ICodeEditor): string | null {
  const model = ed.getModel();
  if (!model) {
    return null;
  }
  const selections = ed.getSelections();
  if (!selections?.length) {
    return null;
  }
  const parts: string[] = [];
  for (const range of selections) {
    if (range.isEmpty()) {
      continue;
    }
    parts.push(model.getValueInRange(range));
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join("\n");
}

export function FileEditorPanel(props: FileEditorPanelContextProps) {
  const sessionData = useWorkspaceSessionPanelData();
  const sessionActions = useWorkspaceSessionPanelActions();
  const { sessionSurface } = useSessionCenterPorts();
  const sessionFileEditorState = sessionSurface.fileEditorState;
  const tabs = props.tabs ?? sessionFileEditorState?.tabs ?? [];
  const activePath = props.activePath ?? sessionFileEditorState?.activePath ?? "";
  const showTabStrip = props.showTabStrip ?? true;
  const title = props.title ?? "Multi-file editor";
  const resolvedTheme = props.resolvedTheme ?? sessionData.resolvedTheme;
  const onGenerateTasks = props.onGenerateTasks ?? null;
  const agentSendTargets = props.agentSendTargets;
  const onExitFileEditorForAgentHandoff = props.onExitFileEditorForAgentHandoff;
  const onChange = props.onChange ?? sessionActions.onChangeActiveFileEditorContent;
  const onSave = props.onSave ?? sessionActions.onSaveActiveFileEditor;
  const onRevert = props.onRevert ?? sessionActions.onRevertActiveFileEditor;
  const onSelectTab = props.onSelectTab ?? sessionActions.onFocusFileEditorTab;
  const onCloseTab = props.onCloseTab ?? sessionActions.onCloseFileEditorTab;
  const onClose = props.onClose;

  if (!tabs.length || !activePath) {
    return null;
  }

  const activeTab = tabs.find((tab) => tab.path === activePath) ?? tabs[0];
  const handleClose = onClose ?? (() => onCloseTab(activeTab.path));
  const pathName = activeTab?.path || "";
  const content = activeTab?.content || "";
  const savedContent = activeTab?.savedContent || "";
  const isLoading = activeTab?.isLoading ?? false;
  const isSaving = activeTab?.isSaving ?? false;
  const errorMessage = activeTab?.errorMessage ?? null;
  const isImage = activeTab?.kind === "image";
  const imageDataUrl = activeTab?.imageDataUrl ?? null;
  const isDirty = !isImage && content !== savedContent;
  const language = useMemo(() => getMonacoLanguage(pathName), [pathName]);
  const disposeSendActionsRef = useRef<(() => void) | null>(null);
  const [monacoEditor, setMonacoEditor] = useState<editor.IStandaloneCodeEditor | null>(null);
  const [markdownView, setMarkdownView] = useState<"preview" | "edit">("preview");
  const isMarkdownFile = !isImage && /\.(md|markdown)$/i.test(pathName);

  useEffect(() => {
    if (isMarkdownFile) {
      setMarkdownView("preview");
    }
  }, [pathName, isMarkdownFile]);

  const sendTargetsKey = useMemo(
    () => (agentSendTargets ?? []).map((target) => `${target.id}\n${target.label}`).join("\0"),
    [agentSendTargets]
  );

  const handleEditorMount: OnMount = (editorInstance) => {
    setMonacoEditor(editorInstance);
  };

  useEffect(() => {
    if (isImage) {
      setMonacoEditor(null);
    }
  }, [isImage]);

  useLayoutEffect(() => {
    disposeSendActionsRef.current?.();
    disposeSendActionsRef.current = null;

    if (!monacoEditor || isImage) {
      return;
    }

    const targets = agentSendTargets ?? [];
    if (targets.length === 0) {
      return;
    }

    const disposables: Array<{ dispose: () => void }> = [];
    for (const target of targets) {
      disposables.push(
        monacoEditor.addAction({
          id: `nora.sendSelectionToAgent.${target.id}`,
          label: `Send selection to ${target.label}`,
          contextMenuGroupId: "navigation",
          contextMenuOrder: 1.85,
          run: (ed) => {
            const text = getMultiSelectionText(ed);
            if (!text) {
              return;
            }
            void (async () => {
              onExitFileEditorForAgentHandoff?.();
              await sendAgentTerminalText({
                agentId: target.id,
                text,
                focusAgent: async (agentId) => {
                  await noraAgentClient.focusAgent(agentId);
                }
              });
            })();
          }
        })
      );
    }

    disposeSendActionsRef.current = () => {
      disposables.forEach((d) => d.dispose());
    };

    return () => {
      disposeSendActionsRef.current?.();
      disposeSendActionsRef.current = null;
    };
  }, [isImage, monacoEditor, onExitFileEditorForAgentHandoff, sendTargetsKey]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        event.stopPropagation();
        if (!isLoading && !isSaving && !isImage) {
          onSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isImage, isLoading, isSaving, onSave]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <SquarePen className="size-3.5" />
              {title}
            </div>
            <div className="mt-1 truncate text-sm font-medium" title={pathName}>
              {pathName}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {isLoading ? "Loading file..." : isSaving ? "Saving changes..." : isDirty ? "Unsaved changes" : "Saved"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onGenerateTasks ? (
              <Button variant="outline" size="sm" onClick={onGenerateTasks} disabled={isLoading || isSaving}>
                <FolderKanban className="size-3.5" />
                Generate Tasks
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={onRevert} disabled={isLoading || isSaving || !isDirty}>
              <RotateCcw className="size-3.5" />
              Revert
            </Button>
            <Button variant="default" size="sm" onClick={onSave} disabled={isLoading || isSaving || !isDirty}>
              {isSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleClose}>
              <X className="size-3.5" />
              Close
            </Button>
          </div>
        </div>
      </div>
      {showTabStrip ? (
      <div className="border-b border-border/50 bg-background px-2 pt-2">
        <div className="flex items-end gap-1 overflow-x-auto pb-0.5">
          {tabs.map((tab) => {
            const tabDirty = tab.content !== tab.savedContent;
            const isActive = tab.path === activePath;
            const label = getFileName(tab.path);
            return (
              <div
                key={tab.path}
                className={cn(
                  "group flex min-w-0 max-w-[240px] items-center gap-1 rounded-t-[6px] border border-b-0 px-3 py-2 text-sm transition",
                  isActive
                    ? "border-border bg-background text-foreground"
                    : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => onSelectTab(tab.path)}
                  title={tab.path}
                >
                  <span className="truncate">{label}</span>
                  {tabDirty ? <span className="ml-1 text-primary">•</span> : null}
                </button>
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  onClick={() => onCloseTab(tab.path)}
                  aria-label={`Close ${tab.path}`}
                  title={`Close ${tab.path}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      ) : null}
      {errorMessage ? (
        <div className="m-4 flex items-start gap-3 rounded-[6px] border border-destructive/35 bg-destructive/8 px-4 py-3 text-sm text-foreground">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <div className="font-medium">Editor error</div>
            <div className="mt-1 text-muted-foreground">{errorMessage}</div>
          </div>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 px-4 pb-4 pt-3">
        <div className="h-full min-h-0 overflow-hidden rounded-[6px] border border-border/60 bg-background">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading file contents...
            </div>
          ) : isImage ? (
            imageDataUrl ? (
              <div className="flex h-full items-center justify-center bg-muted/20 p-6">
                <img
                  src={imageDataUrl}
                  alt={pathName}
                  className="max-h-full max-w-full rounded-[6px] object-contain shadow-lg"
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center gap-3 text-sm text-muted-foreground">
                <ImageIcon className="size-4" />
                Unable to preview this image.
              </div>
            )
            ) : isMarkdownFile ? (
            <Tabs
              value={markdownView}
              onValueChange={(value) => setMarkdownView(value === "edit" ? "edit" : "preview")}
              className="flex h-full min-h-0 flex-col px-3 pb-3 pt-3"
            >
              <TabsList className="mb-2 h-9 w-fit shrink-0">
                <TabsTrigger value="preview" className="inline-flex items-center gap-1.5">
                  <Eye className="size-3.5" aria-hidden />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="edit" className="inline-flex items-center gap-1.5">
                  <PencilLine className="size-3.5" aria-hidden />
                  Edit
                </TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
                <div className="h-full min-h-0 overflow-auto px-4 py-4">
                  <MarkdownRenderer>{content}</MarkdownRenderer>
                </div>
              </TabsContent>
              <TabsContent value="edit" className="mt-0 min-h-0 flex-1 overflow-hidden p-0 data-[state=inactive]:hidden">
                <div className="h-full min-h-0">
                  <Editor
                    path={pathName}
                    language={language}
                    value={content}
                    theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
                    onMount={handleEditorMount}
                    onChange={(value) => onChange(value ?? "")}
                    options={{
                      automaticLayout: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      smoothScrolling: true,
                      cursorBlinking: "smooth",
                      padding: { top: 16, bottom: 16 },
                      renderLineHighlight: "gutter",
                      tabSize: 2
                    }}
                    loading={
                      <div className={cn("flex h-full items-center justify-center gap-3 text-sm text-muted-foreground")}>
                        <LoaderCircle className="size-4 animate-spin" />
                        Loading editor...
                      </div>
                    }
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Editor
              path={pathName}
              language={language}
              value={content}
              theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
              onMount={handleEditorMount}
              onChange={(value) => onChange(value ?? "")}
              options={{
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                smoothScrolling: true,
                cursorBlinking: "smooth",
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: "gutter",
                tabSize: 2
              }}
              loading={
                <div className={cn("flex h-full items-center justify-center gap-3 text-sm text-muted-foreground")}>
                  <LoaderCircle className="size-4 animate-spin" />
                  Loading editor...
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
