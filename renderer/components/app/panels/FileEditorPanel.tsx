import {
  useWorkspaceSessionPanelActions,
  useWorkspaceSessionPanelData
} from "@/components/app/context/workspaceSessionPanelContext";
import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { useFileEditorMonacoWorkspaceSupport } from "@/components/app/hooks/useFileEditorMonacoWorkspaceSupport";
import { useSessionCenterPorts } from "@/components/app/hooks/useSessionCenterPorts";
import { handoffPromptToAgent } from "@/components/app/logic/agentHandoff";
import { joinWorkspacePath } from "@/components/app/logic/appUtils";
import { normalizeBrowserUrl } from "@/components/app/logic/browserTabs";
import { buildFileEditorBreadcrumbs, getFileEditorLeafName } from "@/components/app/logic/fileEditorPath";
import {
  isWorkspaceImageLinkTarget,
  resolveWorkspaceMarkdownLinkTarget
} from "@/components/app/logic/markdownLinkTargets";
import {
  buildMonacoModelPath,
  configureMonacoTypeScript,
  resolveFileEditorMonacoTheme,
  resolveMonacoLanguageId
} from "@/components/app/logic/fileEditorMonaco";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import type { FileEditorPanelProps } from "@/components/app/types/component.types";
import { cn } from "@/lib/utils";
import type { BeforeMount, Monaco, OnMount } from "@monaco-editor/react";
import Editor from "@monaco-editor/react";
import { AlertCircle, Columns2, Eye, Image as ImageIcon, LoaderCircle, PencilLine, X } from "lucide-react";
import type { editor } from "monaco-editor";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type FileEditorPanelContextProps = Partial<FileEditorPanelProps>;

type MarkdownEditorTabView = "preview" | "edit" | "hybrid";

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
  const sessionAppSettings = sessionData.appSettings;
  const tabs = props.tabs ?? sessionFileEditorState?.tabs ?? [];
  const activePath = props.activePath ?? sessionFileEditorState?.activePath ?? "";
  const showTabStrip = props.showTabStrip ?? true;
  const resolvedTheme = props.resolvedTheme ?? sessionData.resolvedTheme;
  const fileEditorThemeId = props.fileEditorThemeId ?? sessionAppSettings?.fileEditorThemeId ?? "default";
  const agentSendTargets = props.agentSendTargets;
  const onExitFileEditorForAgentHandoff = props.onExitFileEditorForAgentHandoff;
  const onChange = props.onChange ?? sessionActions.onChangeActiveFileEditorContent;
  const onSave = props.onSave ?? sessionActions.onSaveActiveFileEditor;
  const onSelectTab = props.onSelectTab ?? sessionActions.onFocusFileEditorTab;
  const onCloseTab = props.onCloseTab ?? sessionActions.onCloseFileEditorTab;
  const onOpenFileEditor = props.onOpenFileEditor;
  const onOpenWorkspaceBrowser = props.onOpenWorkspaceBrowser ?? sessionActions.onOpenWorkspaceBrowser;
  const onSetActiveWorkspaceContentTab = props.onSetActiveWorkspaceContentTab ?? sessionActions.onSetActiveWorkspaceContentTab;

  if (!tabs.length || !activePath) {
    return null;
  }

  const activeTab = tabs.find((tab) => tab.path === activePath) ?? tabs[0];
  const pathName = activeTab?.path || "";
  const content = activeTab?.content || "";
  const savedContent = activeTab?.savedContent || "";
  const isLoading = activeTab?.isLoading ?? false;
  const isSaving = activeTab?.isSaving ?? false;
  const errorMessage = activeTab?.errorMessage ?? null;
  const isImage = activeTab?.kind === "image";
  const imageDataUrl = activeTab?.imageDataUrl ?? null;
  const isReadOnlyTab = activeTab?.isReadOnly === true;
  const isDirty = !isImage && !isReadOnlyTab && content !== savedContent;
  const breadcrumbs = useMemo(() => buildFileEditorBreadcrumbs(pathName), [pathName]);
  const language = useMemo(() => resolveMonacoLanguageId(pathName), [pathName]);
  const disposeSendActionsRef = useRef<(() => void) | null>(null);
  const [monacoEditor, setMonacoEditor] = useState<editor.IStandaloneCodeEditor | null>(null);
  const [markdownViewByTabPath, setMarkdownViewByTabPath] = useState<Record<string, MarkdownEditorTabView>>({});
  const isMarkdownFile = !isImage && /\.(md|markdown)$/i.test(pathName);
  const monacoRef = useRef<Monaco | null>(null);
  const editorRootPath = activeTab?.rootPath ?? sessionData.project?.rootPath ?? null;
  const projectRootPath = sessionData.project?.rootPath ?? null;
  const monacoModelPath = useMemo(() => buildMonacoModelPath(pathName, editorRootPath), [pathName, editorRootPath]);
  const monacoTheme = useMemo(
    () => resolveFileEditorMonacoTheme(fileEditorThemeId, resolvedTheme),
    [fileEditorThemeId, resolvedTheme]
  );
  const editorOptions = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      scrollBeyondLastLine: false,
      wordWrap: "on",
      smoothScrolling: true,
      cursorBlinking: "smooth",
      padding: { top: 16, bottom: 16 },
      renderLineHighlight: "gutter",
      renderValidationDecorations: "off",
      tabSize: 2,
      readOnly: isReadOnlyTab
    }),
    [isReadOnlyTab]
  );

  const markdownView = useMemo<MarkdownEditorTabView>(() => {
    if (!isMarkdownFile || isReadOnlyTab) {
      return "edit";
    }
    return markdownViewByTabPath[pathName] ?? "edit";
  }, [isMarkdownFile, isReadOnlyTab, markdownViewByTabPath, pathName]);

  const setMarkdownView = useCallback(
    (mode: MarkdownEditorTabView) => {
      if (!isMarkdownFile || isReadOnlyTab) {
        return;
      }
      setMarkdownViewByTabPath((prev) => ({ ...prev, [pathName]: mode }));
    },
    [isMarkdownFile, isReadOnlyTab, pathName]
  );

  useEffect(() => {
    const openPaths = new Set(tabs.map((tab) => tab.path));
    setMarkdownViewByTabPath((prev) => {
      const staleKeys = Object.keys(prev).filter((path) => !openPaths.has(path));
      if (staleKeys.length === 0) {
        return prev;
      }
      const next = { ...prev };
      for (const path of staleKeys) {
        delete next[path];
      }
      return next;
    });
  }, [tabs]);

  useEffect(() => {
    if (isMarkdownFile && markdownView === "preview") {
      setMonacoEditor(null);
    }
  }, [isMarkdownFile, markdownView]);

  const handleMarkdownLinkClick = async (href: string) => {
    const projectId = sessionData.project?.id ?? null;
    if (!projectId) {
      return;
    }

    const workspaceLinkTarget = resolveWorkspaceMarkdownLinkTarget(pathName, href);
    if (workspaceLinkTarget && onOpenFileEditor) {
      const rootPath = editorRootPath ?? sessionData.project?.rootPath ?? null;

      try {
        if (isWorkspaceImageLinkTarget(workspaceLinkTarget)) {
          await noraWorkspaceClient.readWorkspaceImageFile({
            projectId,
            path: workspaceLinkTarget,
            rootPath: rootPath || undefined
          });
        } else {
          await noraWorkspaceClient.readWorkspaceFile({
            projectId,
            path: workspaceLinkTarget,
            rootPath: rootPath || undefined
          });
        }

        await onOpenFileEditor(workspaceLinkTarget, {
          selectChange: false,
          rootPath
        });
        return;
      } catch {
        // fall through to browser handling when the link does not resolve in the workspace
      }
    }

    const normalizedUrl = normalizeBrowserUrl(href);
    if (!normalizedUrl) {
      return;
    }

    onSetActiveWorkspaceContentTab(null);
    onOpenWorkspaceBrowser(projectId, normalizedUrl);
  };

  const sendTargetsKey = useMemo(
    () => (agentSendTargets ?? []).map((target) => `${target.id}\n${target.label}`).join("\0"),
    [agentSendTargets]
  );

  const handleEditorBeforeMount: BeforeMount = (monacoInstance) => {
    monacoRef.current = monacoInstance;
    configureMonacoTypeScript(monacoInstance, projectRootPath);
  };

  const handleEditorMount: OnMount = (editorInstance, monacoInstance) => {
    monacoRef.current = monacoInstance;
    setMonacoEditor(editorInstance);
  };

  useEffect(() => {
    if (!monacoRef.current) {
      return;
    }
    configureMonacoTypeScript(monacoRef.current, projectRootPath);
  }, [projectRootPath]);

  useFileEditorMonacoWorkspaceSupport({
    monaco: monacoRef.current,
    projectId: sessionData.project?.id ?? null,
    projectRootPath
  });

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
              await handoffPromptToAgent({
                agentId: target.id,
                prompt: {
                  source: "file-editor",
                  title: `Selection from ${getFileEditorLeafName(pathName)}`,
                  text,
                  workspacePaths: editorRootPath ? [{ path: joinWorkspacePath(editorRootPath, pathName), kind: "file" }] : [],
                  contextSelections: [],
                  references: editorRootPath
                    ? [{ kind: "workspace-path", label: "Source file", value: joinWorkspacePath(editorRootPath, pathName) }]
                    : []
                },
                focusAgent: async (agentId) => {
                  await noraAgentClient.focusAgent(agentId);
                },
                updateSnapshot: () => {}
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
        if (!isLoading && !isSaving && !isImage && !isReadOnlyTab) {
          onSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isImage, isLoading, isReadOnlyTab, isSaving, onSave]);

  const monacoFileEditor = (
    <Editor
      beforeMount={handleEditorBeforeMount}
      path={monacoModelPath}
      language={language}
      value={content}
      theme={monacoTheme}
      onMount={handleEditorMount}
      onChange={(value) => onChange(value ?? "")}
      options={editorOptions}
      loading={
        <div className={cn("flex h-full items-center justify-center gap-3 text-sm text-muted-foreground")}>
          <LoaderCircle className="size-4 animate-spin" />
          Loading editor...
        </div>
      }
    />
  );

  return (
    <div className="center-column-surface flex h-full min-h-0 flex-col bg-card/95">
      <div className="border-b border-border/50 px-3 py-2">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-xs text-muted-foreground" title={pathName}>
            {breadcrumbs.map((segment, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={`${segment}-${index}`} className="flex min-w-0 items-center gap-1">
                  {index > 0 ? <span className="shrink-0 text-muted-foreground/60">/</span> : null}
                  <span className={cn("shrink-0 whitespace-nowrap", isLast ? "truncate font-medium text-foreground" : "")}>
                    {segment}
                  </span>
                  {isLast && isDirty ? <span className="shrink-0 text-primary">•</span> : null}
                </div>
              );
            })}
          </div>
          {!isLoading && isMarkdownFile && !isReadOnlyTab ? (
            <div
              className="inline-flex shrink-0 items-center rounded-[4px] border border-border/60 bg-background/40 p-1"
              role="tablist"
              aria-label="Markdown view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={markdownView === "preview"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  markdownView === "preview" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setMarkdownView("preview")}
              >
                <Eye className="size-3.5 shrink-0" aria-hidden />
                Preview
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={markdownView === "hybrid"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  markdownView === "hybrid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setMarkdownView("hybrid")}
              >
                <Columns2 className="size-3.5 shrink-0" aria-hidden />
                Split
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={markdownView === "edit"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  markdownView === "edit" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setMarkdownView("edit")}
              >
                <PencilLine className="size-3.5 shrink-0" aria-hidden />
                Edit
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {showTabStrip ? (
      <div className="border-b border-border/50 bg-transparent px-2 pt-2">
        <div className="thin-scrollbar flex items-end gap-1 overflow-x-auto pb-0.5">
          {tabs.map((tab) => {
            const tabDirty = tab.kind !== "image" && tab.isReadOnly !== true && tab.content !== tab.savedContent;
            const isActive = tab.path === activePath;
            const label = getFileEditorLeafName(tab.path);
            return (
              <div
                key={tab.path}
                className={cn(
                  "group flex min-w-0 max-w-[240px] items-center gap-1 rounded-t-[6px] border border-b-0 px-3 py-2 text-sm transition",
                  isActive
                    ? "border-border bg-background/70 text-foreground"
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
      <div className="min-h-0 flex-1">
        <div className="h-full min-h-0 overflow-hidden bg-card/95">
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
            ) : isMarkdownFile && (isReadOnlyTab || markdownView === "preview") ? (
            <div className="thin-scrollbar h-full min-h-0 overflow-auto px-4 py-4">
              <MarkdownRenderer onLinkClick={handleMarkdownLinkClick}>{content}</MarkdownRenderer>
            </div>
          ) : isMarkdownFile && markdownView === "hybrid" ? (
            <div className="flex h-full min-h-0 flex-row">
              <div className="min-h-0 min-w-0 flex-1 border-r border-border/50">{monacoFileEditor}</div>
              <div className="thin-scrollbar min-h-0 min-w-0 flex-1 overflow-auto px-4 py-4">
                <MarkdownRenderer onLinkClick={handleMarkdownLinkClick}>{content}</MarkdownRenderer>
              </div>
            </div>
          ) : (
            monacoFileEditor
          )}
        </div>
      </div>
    </div>
  );
}
