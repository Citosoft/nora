import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import { useWorkspaceSessionContext } from "@/components/app/context/workspaceSessionContext";
import { useFocusedAgentInjectableContexts } from "@/components/app/hooks/useFocusedAgentInjectableContexts";
import { useWorkspaceProjectFavicon } from "@/components/app/hooks/useWorkspaceProjectFavicon";
import {
  buildAgentInputPayload,
  buildPlainTerminalInputWithWorkspacePaths
} from "@/components/app/logic/agentInputAttachments";
import { workspacePathDraftsFromNativeFileDrop } from "@/components/app/logic/agentInputNativeFileDrop";
import { formatTaskFileInstruction, resolveTaskInstructionPath } from "@/components/app/logic/appUtils";
import { SHORTCUT_DEFINITIONS, formatShortcutKeyParts, formatShortcutKeys } from "@/components/app/logic/keyboardShortcuts";
import { readFileAsDataUrl } from "@/components/app/logic/readFileAsDataUrl";
import {
  getStoredTerminalShellIds,
  rememberTerminalShell,
  resolvePreferredTerminalShellId,
  setDefaultTerminalShell
} from "@/components/app/logic/terminalShellPreferences";
import {
  dataTransferDeclaresPathOrFileDrop,
  readWorkspaceRelativePathFromDataTransfer
} from "@/components/app/logic/workspacePathDrag";
import { getPreferredWorkspaceScripts } from "@/components/app/logic/workspaceScripts";
import { dataTransferDeclaresTaskDrop, readWorkspaceTaskFromDataTransfer } from "@/components/app/logic/workspaceTaskDrag";
import type { TerminalSubmission } from "@/components/app/types";
import type { PastedImageDraft, WorkspacePathAttachmentDraft } from "@/components/app/types/agentInput.types";
import type { FocusedAgentWorkspaceHomeProps } from "@/components/app/types/focusedAgentEmptyState.types";
import type { FocusedAgentInjectableContext } from "@/components/app/types/focusedAgentPanelParts.types";
import type {
  UseFocusedAgentPanelSessionArgs,
  UseFocusedAgentPanelSessionResult
} from "@/components/app/types/useFocusedAgentPanelSession.types";
import type { WorkspaceTaskDragPayload } from "@/components/app/types/workspaceTaskDrag.types";
import { isAgentToolAvailable } from "@shared/agentToolState";
import type { AgentContextPreview } from "@shared/appTypes";
import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type DragEvent as ReactDragEvent } from "react";

export const useFocusedAgentPanelSession = ({
  agent,
  terminal
}: UseFocusedAgentPanelSessionArgs): UseFocusedAgentPanelSessionResult => {
  const {
    project,
    workspace,
    tools,
    projectScripts,
    terminalShells,
    platform,
    resolvedTheme,
    terminalThemeId,
    terminalFontId,
    onChooseProject,
    onRefreshCatalog,
    onCreateInWorkspace,
    onOpenCreateTerminal,
    onOpenWorkspaceTerminalPresets,
    onOpenWorkspaceBrowser,
    onOpenAiChat,
    onOpenWorkspaceSwitcher,
    onOpenTaskBoard,
    onOpenSpecBrowser,
    onOpenNoteBrowser,
    onFocusAgent,
    onFocusTerminal,
    onFocusBrowserTab,
    onRestart,
    onRestartTerminal,
    onClearTerminal,
    onDestroyRequest,
    onDestroyTerminal,
    browserTabs
  } = useWorkspaceSessionContext();
  const [showContext, setShowContext] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [contextPreview, setContextPreview] = useState<AgentContextPreview | null>(null);
  const [contextStatus, setContextStatus] = useState<"idle" | "loading">("idle");
  const [isClearingContext, setIsClearingContext] = useState(false);
  const [pastedImages, setPastedImages] = useState<PastedImageDraft[]>([]);
  const [attachedWorkspacePaths, setAttachedWorkspacePaths] = useState<WorkspacePathAttachmentDraft[]>([]);
  const [previewImageDraft, setPreviewImageDraft] = useState<PastedImageDraft | null>(null);
  const [isSendingTerminalInput, setIsSendingTerminalInput] = useState(false);
  const [isSavingPastedImage, setIsSavingPastedImage] = useState(false);
  const workspaceProjectFaviconUrl = useWorkspaceProjectFavicon(workspace?.project.id ?? null, workspace?.project.rootPath ?? null);
  const [terminalSubmission, setTerminalSubmission] = useState<TerminalSubmission | null>(null);
  const [terminalResetVersion, setTerminalResetVersion] = useState(0);
  const [isRefreshingRemoteTools, setIsRefreshingRemoteTools] = useState(false);
  const [showRemoteToolDiagnostics, setShowRemoteToolDiagnostics] = useState(false);
  const [selectedShellId, setSelectedShellId] = useState<string | null>(null);
  const [defaultShellId, setDefaultShellId] = useState<string | null>(() => getStoredTerminalShellIds().defaultShellId);
  const infoPopoverRef = useRef<HTMLDivElement | null>(null);
  const terminalInputRef = useRef<HTMLInputElement | null>(null);
  const activeSessionId = agent?.id || terminal?.id || null;
  const focusedSession = agent ?? terminal;
  const isPreparingWorktree = !!agent && agent.status === "starting" && agent.lastTerminalLine === "Preparing worktree...";
  const sessionWorkspaceAbsoluteRoot = (() => {
    const raw = (agent?.workspace ?? terminal?.workspace ?? workspace?.project?.rootPath ?? "").trim();
    return raw.length > 0 ? raw : null;
  })();
  const { injectableContexts, isLoadingInjectableContexts } = useFocusedAgentInjectableContexts({
    agent,
    workspace
  });

  useEffect(() => {
    setShowContext(false);
    setShowInfo(false);
    setContextPreview(null);
    setContextStatus("idle");
    setIsClearingContext(false);
    if (terminalInputRef.current) {
      terminalInputRef.current.value = "";
    }
    setPastedImages([]);
    setAttachedWorkspacePaths([]);
    setPreviewImageDraft(null);
    setIsSendingTerminalInput(false);
    setIsSavingPastedImage(false);
    setTerminalSubmission(null);
  }, [agent?.id, terminal?.id]);

  useEffect(() => {
    const preferredShellId = resolvePreferredTerminalShellId(terminalShells);
    setSelectedShellId((current) => {
      if (current && terminalShells.some((shell) => shell.id === current)) {
        return current;
      }
      return preferredShellId;
    });
    setDefaultShellId(getStoredTerminalShellIds().defaultShellId);
  }, [terminalShells]);

  useEffect(() => {
    if (!showInfo) {
      return;
    }

    const handlePointerDown = (event: globalThis.MouseEvent) => {
      if (!infoPopoverRef.current?.contains(event.target as Node)) {
        setShowInfo(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [showInfo]);

  useEffect(() => {
    if (!agent || !showContext) {
      return;
    }

    let cancelled = false;
    let refreshTimer: number | null = null;

    const load = async () => {
      setContextStatus("loading");
      try {
        const next = await noraAgentClient.getAgentContextPreview(agent.id);
        if (!cancelled) {
          setContextPreview(next);
          setContextStatus("idle");
        }
      } catch {
        if (!cancelled) {
          setContextStatus("idle");
        }
      }
    };

    void load();

    const scheduleLoad = () => {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void load();
      }, 180);
    };

    const unsubscribe = noraTerminalClient.onTerminalData((payload) => {
      if (payload.sessionId !== agent.id) {
        return;
      }
      scheduleLoad();
    });

    return () => {
      cancelled = true;
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
      unsubscribe();
    };
  }, [agent, showContext]);

  const handleClearContext = async () => {
    if (!agent || isClearingContext) {
      return;
    }

    setIsClearingContext(true);
    try {
      const next = await noraAgentClient.clearAgentContext(agent.id);
      setContextPreview(next);
    } finally {
      setIsClearingContext(false);
    }
  };

  const handleClearTerminal = async () => {
    if (!activeSessionId) {
      return;
    }

    const next = await onClearTerminal(activeSessionId);
    if (next) {
      setTerminalResetVersion((current) => current + 1);
    }
  };

  const handleRestart = async () => {
    const next = agent ? await onRestart(agent.id) : terminal ? await onRestartTerminal(terminal.id) : null;

    if (next) {
      setTerminalResetVersion((current) => current + 1);
    }
  };

  const handleSendTerminalInput = async () => {
    if (!activeSessionId || isSendingTerminalInput || isSavingPastedImage) {
      return;
    }

    const inputValue = terminalInputRef.current?.value ?? "";
    const hasBody =
      inputValue.trim().length > 0 || pastedImages.length > 0 || attachedWorkspacePaths.length > 0;
    if (!hasBody) {
      return;
    }

    setIsSendingTerminalInput(true);
    try {
      const submissionValue = agent
        ? buildAgentInputPayload(inputValue, pastedImages, attachedWorkspacePaths, sessionWorkspaceAbsoluteRoot)
        : buildPlainTerminalInputWithWorkspacePaths(inputValue, attachedWorkspacePaths, sessionWorkspaceAbsoluteRoot);
      setTerminalSubmission({
        nonce: Date.now(),
        value: submissionValue
      });
      if (terminalInputRef.current) {
        terminalInputRef.current.value = "";
      }
      setPastedImages([]);
      setAttachedWorkspacePaths([]);
    } finally {
      setIsSendingTerminalInput(false);
    }
  };

  const handleInjectContext = (context: FocusedAgentInjectableContext) => {
    setAttachedWorkspacePaths((current) => {
      if (current.some((draft) => draft.path === context.contextFilePath)) {
        return current;
      }
      return [
        ...current,
        {
          id: `agent-context-${context.agentId}`,
          path: context.contextFilePath,
          kind: "file"
        }
      ];
    });
  };

  const handleAgentInputPaste = async (event: ReactClipboardEvent<HTMLInputElement>) => {
    if (!agent || isSavingPastedImage) {
      return;
    }

    const imageItems = Array.from(event.clipboardData.items).filter((item) => item.type.startsWith("image/"));
    if (!imageItems.length) {
      return;
    }

    event.preventDefault();
    setIsSavingPastedImage(true);
    try {
      const nextDrafts: PastedImageDraft[] = [];

      for (const imageItem of imageItems) {
        const file = imageItem.getAsFile();
        if (!file) {
          continue;
        }

        const dataUrl = await readFileAsDataUrl(file);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const reference = await noraSystemClient.savePastedImage({
          data: bytes,
          mimeType: file.type || imageItem.type || "image/png"
        });
        nextDrafts.push({
          ...reference,
          id: `${Date.now()}-${nextDrafts.length}`,
          dataUrl
        });
      }

      if (!nextDrafts.length) {
        return;
      }

      setPastedImages((current) => [...current, ...nextDrafts]);
    } finally {
      setIsSavingPastedImage(false);
    }
  };

  const handleRemovePastedImage = (draftId: string) => {
    setPastedImages((current) => current.filter((draft) => draft.id !== draftId));
    setPreviewImageDraft((current) => (current?.id === draftId ? null : current));
  };

  const handleRemoveAttachedWorkspacePath = (draftId: string) => {
    setAttachedWorkspacePaths((current) => current.filter((draft) => draft.id !== draftId));
  };

  const launchShellId = selectedShellId || resolvePreferredTerminalShellId(terminalShells);
  const addWorkspaceShortcutParts = useMemo(() => {
    const addWorkspaceShortcut = SHORTCUT_DEFINITIONS.find((definition) => definition.id === "open-add-workspace");
    return addWorkspaceShortcut ? formatShortcutKeyParts(addWorkspaceShortcut.keys, platform) : [];
  }, [platform]);
  const workspaceSwitcherShortcutLabel = useMemo(() => {
    const workspaceSwitcherShortcut = SHORTCUT_DEFINITIONS.find((definition) => definition.id === "open-workspace-switcher");
    return workspaceSwitcherShortcut ? formatShortcutKeys(workspaceSwitcherShortcut.keys, platform) : null;
  }, [platform]);
  const isDirectSshWorkspace = workspace?.project.location?.kind === "ssh";
  const directSshHost = workspace?.project.location?.kind === "ssh" ? workspace.project.location.host : null;
  const canSendLiveTerminalInput = agent ? agent.status === "running" : terminal ? terminal.status === "running" : false;
  const buildTaskInstructionText = (taskReference: WorkspaceTaskDragPayload): string => {
    const absoluteTaskPath = resolveTaskInstructionPath(taskReference.projectRootPath, taskReference.taskPath);
    return formatTaskFileInstruction(absoluteTaskPath);
  };
  const prefillTaskInstruction = (taskReference: WorkspaceTaskDragPayload) => {
    const instruction = buildTaskInstructionText(taskReference);
    const input = terminalInputRef.current;
    if (!input) {
      return;
    }
    input.value =
      input.value.trim().length > 0 ? `${input.value.trim()}\n\n${instruction}` : instruction;
  };

  const handleAgentInputDragOver = (event: ReactDragEvent<HTMLInputElement>) => {
    if (!canSendLiveTerminalInput || isSendingTerminalInput || isSavingPastedImage) {
      return;
    }
    const dt = event.dataTransfer;
    if (dataTransferDeclaresPathOrFileDrop(dt) || dataTransferDeclaresTaskDrop(dt)) {
      event.preventDefault();
      dt.dropEffect = "copy";
    }
  };

  const handleAgentInputDrop = (event: ReactDragEvent<HTMLInputElement>) => {
    if (!canSendLiveTerminalInput || isSendingTerminalInput || isSavingPastedImage) {
      return;
    }
    const taskReference = readWorkspaceTaskFromDataTransfer(event.dataTransfer);
    if (taskReference) {
      event.preventDefault();
      prefillTaskInstruction(taskReference);
      window.requestAnimationFrame(() => {
        event.currentTarget.focus();
      });
      return;
    }

    const pathReference = readWorkspaceRelativePathFromDataTransfer(event.dataTransfer);
    if (pathReference) {
      event.preventDefault();
      const kind: WorkspacePathAttachmentDraft["kind"] = pathReference.endsWith("/") ? "directory" : "file";
      setAttachedWorkspacePaths((current) => {
        if (current.some((entry) => entry.path === pathReference)) {
          return current;
        }
        const next: WorkspacePathAttachmentDraft = {
          id: `${Date.now()}-${current.length}`,
          path: pathReference,
          kind
        };
        return [...current, next];
      });
      window.requestAnimationFrame(() => {
        event.currentTarget.focus();
      });
      return;
    }

    if (event.dataTransfer.files.length === 0) {
      return;
    }

    event.preventDefault();
    const nativeDrafts = workspacePathDraftsFromNativeFileDrop(event.dataTransfer, sessionWorkspaceAbsoluteRoot);
    if (nativeDrafts.length === 0) {
      return;
    }

    setAttachedWorkspacePaths((current) => {
      const merged = [...current];
      for (const draft of nativeDrafts) {
        if (merged.some((entry) => entry.path === draft.path)) {
          continue;
        }
        merged.push(draft);
      }
      return merged;
    });
    window.requestAnimationFrame(() => {
      event.currentTarget.focus();
    });
  };

  const launchBlankTerminal = useCallback(() => {
    if (!launchShellId) {
      return;
    }

    const shell = terminalShells.find((entry) => entry.id === launchShellId) || null;
    rememberTerminalShell(launchShellId);
    onOpenCreateTerminal({
      name: "Terminal",
      shellId: launchShellId,
      launchConfig: {
        kind: "blank",
        label: shell ? `Shell (${shell.label})` : "Shell",
        command: ""
      }
    });
  }, [launchShellId, onOpenCreateTerminal, terminalShells]);

  const noSessionWorkspaceHome: FocusedAgentWorkspaceHomeProps | null =
    !agent && !terminal && workspace
      ? (() => {
          const detectedTools = tools.filter((tool) => isAgentToolAvailable(tool));
          const scripts = getPreferredWorkspaceScripts(workspace, projectScripts);
          const workspaceBrowserTabs = browserTabs.filter((tab) => tab.projectId === workspace.project.id);
          const activePorts = (workspace.terminals ?? [])
            .filter((session) => session.status === "running" && session.detectedLocalUrl && session.detectedLocalPort)
            .map((session) => ({
              projectId: workspace.project.id,
              terminalId: session.id,
              terminalName: session.name,
              url: session.detectedLocalUrl!,
              port: session.detectedLocalPort!
            }))
            .sort((left, right) => left.port - right.port);
          const activeSessionCount =
            workspace.agents.length + workspace.terminals.length + workspaceBrowserTabs.length;

          return {
            workspace,
            workspaceProjectFaviconUrl,
            workspaceSwitcherShortcutLabel,
            activeSessionCount,
            workspaceBrowserTabs,
            activePorts,
            detectedTools,
            scripts,
            terminalShells,
            launchShellId,
            defaultShellId,
            isDirectSshWorkspace,
            directSshHost,
            tools,
            isRefreshingRemoteTools,
            showRemoteToolDiagnostics,
            onToggleRemoteToolDiagnostics: () => setShowRemoteToolDiagnostics((current) => !current),
            onRedetectRemoteClis: () => {
              setIsRefreshingRemoteTools(true);
              void onRefreshCatalog().finally(() => {
                setIsRefreshingRemoteTools(false);
              });
            },
            onShellSelectChange: (shellId: string | null) => {
              setSelectedShellId(shellId);
              if (shellId) {
                rememberTerminalShell(shellId);
              }
            },
            onMakeDefaultShell: () => {
              if (!launchShellId) {
                return;
              }
              setDefaultTerminalShell(launchShellId);
              setDefaultShellId(launchShellId);
            },
            onClearDefaultShell: () => {
              setDefaultTerminalShell(null);
              setDefaultShellId(null);
            },
            launchBlankTerminal,
            onOpenWorkspaceSwitcher,
            onOpenTaskBoard,
            onOpenSpecBrowser,
            onOpenNoteBrowser,
            onFocusAgent,
            onFocusTerminal,
            onFocusBrowserTab,
            onOpenWorkspaceBrowser,
            onCreateInWorkspace,
            onOpenAiChat,
            onOpenWorkspaceTerminalPresets,
            onOpenCreateTerminal
          };
        })()
      : null;

  return {
    project,
    workspace,
    platform,
    resolvedTheme,
    terminalThemeId,
    terminalFontId,
    onChooseProject,
    onDestroyRequest,
    onDestroyTerminal,
    workspaceProjectFaviconUrl,
    addWorkspaceShortcutParts,
    noSessionWorkspaceHome,
    showContext,
    setShowContext,
    showInfo,
    setShowInfo,
    contextPreview,
    contextStatus,
    isClearingContext,
    handleClearContext,
    pastedImages,
    attachedWorkspacePaths,
    previewImageDraft,
    setPreviewImageDraft,
    isSendingTerminalInput,
    isSavingPastedImage,
    injectableContexts,
    isLoadingInjectableContexts,
    terminalSubmission,
    terminalResetVersion,
    infoPopoverRef,
    terminalInputRef,
    activeSessionId,
    focusedSession,
    isPreparingWorktree,
    sessionWorkspaceAbsoluteRoot,
    canSendLiveTerminalInput,
    buildTaskInstructionText,
    handleClearTerminal,
    handleRestart,
    handleSendTerminalInput,
    handleInjectContext,
    handleAgentInputPaste,
    handleRemovePastedImage,
    handleRemoveAttachedWorkspacePath,
    handleAgentInputDragOver,
    handleAgentInputDrop
  };
};
