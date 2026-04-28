import { createWorkspaceAiChatTools } from "@/components/app/ai/workspaceAiChatTools";
import { buildWorkspaceChatProviderOptions } from "@/components/app/ai/workspaceChatProviderOptions";
import { useWorkspaceRuntime } from "@/components/app/context/workspaceRuntimeContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import {
  useWorkspaceSessionPanelActions,
  useWorkspaceSessionPanelData
} from "@/components/app/context/workspaceSessionPanelContext";
import { useSessionCenterPorts } from "@/components/app/hooks/useSessionCenterPorts";
import { createAiChatModel, DEFAULT_AI_CHAT_MODEL_BY_PROVIDER, resolveAiChatProvider } from "@/components/app/logic/aiChatModel";
import { getSupportedReasoningLevels, isReasoningLevelSupported } from "@/components/app/logic/aiChatReasoningSupport";
import type { AiChatMessage, AiChatMode, AiChatReasoningLevel } from "@/components/app/types";
import type { AiChatPanelProps } from "@/components/app/types/aiChatPanel.types";
import { useChat } from "@ai-sdk/react";
import { DirectChatTransport, ToolLoopAgent } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AI_CHAT_PANEL_PROVIDERS } from "@/components/app/logic/aiChatPanelConstants";
import { normalizeAiChatPanelPathKey } from "@/components/app/logic/aiChatPanelPathUtils";
import { AiChatComposer } from "./AiChatComposer";
import { AiChatPanelHeader } from "./AiChatPanelHeader";
import { AiChatTranscript } from "./AiChatTranscript";

export const AiChatPanel = (props: AiChatPanelProps) => {
  const sessionData = useWorkspaceSessionPanelData();
  const sessionActions = useWorkspaceSessionPanelActions();
  const { aiModels } = useSessionCenterPorts();
  const snapshot = useCanonicalAppSnapshot();
  const { workspaceFileTree } = useWorkspaceRuntime();
  const activeTab = sessionData.aiChatTab;
  const tabId = props.tabId ?? activeTab?.id;
  const projectId = props.projectId ?? snapshot?.project?.id ?? null;
  const projectName = props.projectName ?? snapshot?.project?.name ?? null;
  const projectRootPath = props.projectRootPath ?? snapshot?.project?.rootPath ?? null;
  const workspaceFilesRootPath = props.workspaceFilesRootPath ?? workspaceFileTree.rootPath;
  const reasoningMode = props.reasoningMode ?? activeTab?.reasoningMode ?? "off";
  const onReasoningModeChange =
    props.onReasoningModeChange ??
    (activeTab ? (mode: AiChatReasoningLevel) => sessionActions.onUpdateAiChatTabReasoningMode(activeTab.id, mode) : undefined);
  const aiSettings = props.aiSettings ?? sessionData.aiSettings;
  const aiModelOptions = props.aiModelOptions ?? aiModels.aiModelOptions;
  const aiModelLoading = props.aiModelLoading ?? aiModels.aiModelLoading;
  const onSelectAiChatProviderModel =
    props.onSelectAiChatProviderModel ?? aiModels.handleSelectAiChatProviderModel;
  const onOpenAiSettings = props.onOpenAiSettings ?? sessionActions.onOpenAiSettings;
  const onSetChatTitle =
    props.onSetChatTitle ??
    (activeTab ? (title: string) => sessionActions.onUpdateAiChatTabTitle(activeTab.id, title) : undefined);
  const messages = props.messages ?? activeTab?.messages ?? [];
  const onMessagesChange =
    props.onMessagesChange ??
    (activeTab
      ? (nextMessages: AiChatMessage[]) => sessionActions.onUpdateAiChatTabMessages(activeTab.id, () => nextMessages)
      : undefined);

  if (!tabId || !onReasoningModeChange || !onSetChatTitle || !onMessagesChange) {
    return null;
  }

  const [draft, setDraft] = useState("");
  const [chatMode, setChatMode] = useState<AiChatMode>("ask");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const provider = resolveAiChatProvider(aiSettings);
  const selectedProviderModel = provider
    ? aiSettings.modelByProvider[provider]?.trim() || DEFAULT_AI_CHAT_MODEL_BY_PROVIDER[provider]
    : null;
  const supportedReasoningLevels = useMemo(
    () => getSupportedReasoningLevels(provider, selectedProviderModel),
    [provider, selectedProviderModel]
  );
  const effectiveReasoningMode = isReasoningLevelSupported(provider, selectedProviderModel, reasoningMode)
    ? reasoningMode
    : "off";
  const model = useMemo(() => createAiChatModel(aiSettings), [aiSettings]);
  const workspaceTools = useMemo(() => {
    if (!projectId) {
      return null;
    }
    const root = workspaceFilesRootPath?.trim();
    return createWorkspaceAiChatTools({
      projectId,
      rootPath: root && root.length > 0 ? root : undefined,
      mode: chatMode,
      onSetChatTitle
    });
  }, [chatMode, onSetChatTitle, projectId, workspaceFilesRootPath]);
  const providerOptions = useMemo(() => {
    if (!provider) {
      return undefined;
    }
    return buildWorkspaceChatProviderOptions(provider, effectiveReasoningMode);
  }, [effectiveReasoningMode, provider]);
  const transport = useMemo(() => {
    if (!model || !workspaceTools || !provider) {
      return null;
    }
    const label = projectName?.trim() || "this workspace";
    const modeInstruction =
      chatMode === "plan"
        ? [
            "You are in Plan mode.",
            "Your job is to thoroughly elicit requirements before drafting specs.",
            "Ask focused follow-up questions to clarify goals, constraints, acceptance criteria, edge cases, rollout, and non-functional requirements.",
            "Do not call create_specs until the user confirms enough detail is available.",
            "When the conversation topic becomes clear, call set_chat_title with a concise subject-focused title.",
            "Once details are complete, call create_specs to write one or more markdown specs under .nora/specs."
          ].join(" ")
        : "You are in Ask mode. Use read-only tools to inspect the workspace and answer accurately. When topic is clear, call set_chat_title with a concise subject-focused title.";
    const agent = new ToolLoopAgent({
      model,
      tools: workspaceTools,
      instructions: [
        `You are helping with the Nora project workspace "${label}".`,
        "Answer using tools when you need file contents, directory listings, text search, path existence, or git status. Do not guess file contents or repository layout.",
        "Prefer small reads: use line ranges for large files. Paths are repo-relative with forward slashes.",
        modeInstruction,
        "Be concise and helpful. If code is requested, provide ready-to-run snippets."
      ].join(" "),
      ...(providerOptions ? { providerOptions } : {})
    });
    return new DirectChatTransport({ agent });
  }, [chatMode, model, projectName, provider, providerOptions, workspaceTools]);

  const { messages: chatMessages, sendMessage, stop, status, error } = useChat<AiChatMessage>({
    id: `workspace-ai-chat-${tabId}`,
    messages,
    ...(transport ? { transport } : {})
  });

  useEffect(() => {
    onMessagesChange(chatMessages);
  }, [chatMessages, onMessagesChange]);

  useEffect(() => {
    if (effectiveReasoningMode === reasoningMode) {
      return;
    }
    onReasoningModeChange(effectiveReasoningMode);
  }, [effectiveReasoningMode, onReasoningModeChange, reasoningMode]);

  useEffect(() => {
    if (!error) {
      return;
    }
    const el = transcriptRef.current;
    if (!el) {
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [error]);

  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) {
      return;
    }
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [chatMessages, error, status]);

  const selectedProvider = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "None";
  const selectedModel = provider ? aiSettings.modelByProvider[provider] : "";

  const busy = status === "submitted" || status === "streaming";
  const showWaitingIndicator = status === "submitted" && !error;
  const canSend = Boolean(draft.trim() && transport && !busy);
  const showModelBar = AI_CHAT_PANEL_PROVIDERS.some((p) => aiSettings.apiKeys[p].trim().length > 0);
  const showConfigureAiSettingsShortcut = !provider;

  const workspacePill = useMemo(() => {
    if (!projectId) {
      return {
        label: "No workspace",
        title: "Open or focus a project to scope file tools and paths."
      };
    }
    const name = projectName?.trim() || "Project";
    const main = projectRootPath?.trim() ?? "";
    const filesRoot = workspaceFilesRootPath?.trim() ?? "";
    const usingWorktree =
      main.length > 0 && filesRoot.length > 0 && normalizeAiChatPanelPathKey(main) !== normalizeAiChatPanelPathKey(filesRoot);
    if (!usingWorktree) {
      return {
        label: name,
        title: `${name} — main checkout; tools use this repo.`
      };
    }
    const pathForTitle = filesRoot.replace(/\\/g, "/");
    return {
      label: `${name} · worktree`,
      title: `${name} — tools use this worktree: ${pathForTitle}`
    };
  }, [projectId, projectName, projectRootPath, workspaceFilesRootPath]);

  const submitDraft = useCallback(() => {
    const value = draft.trim();
    if (!value || !transport || busy) {
      return;
    }
    void sendMessage({ text: value });
    setDraft("");
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [busy, draft, sendMessage, transport]);

  return (
    <div className="center-column-surface flex h-full min-h-0 flex-col bg-card/95">
      <AiChatPanelHeader
        provider={provider}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        onOpenAiSettings={onOpenAiSettings}
        isStreaming={status === "streaming"}
        onStop={stop}
      />
      <AiChatTranscript
        transcriptRef={transcriptRef}
        chatMessages={chatMessages}
        showWaitingIndicator={showWaitingIndicator}
        error={error}
      />
      <AiChatComposer
        textareaRef={textareaRef}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={submitDraft}
        showConfigureAiSettingsShortcut={showConfigureAiSettingsShortcut}
        showModelBar={showModelBar}
        onOpenAiSettings={onOpenAiSettings}
        aiSettings={aiSettings}
        aiModelOptions={aiModelOptions}
        aiModelLoading={aiModelLoading}
        onSelectAiChatProviderModel={onSelectAiChatProviderModel}
        workspacePill={workspacePill}
        chatMode={chatMode}
        onChatModeChange={setChatMode}
        provider={provider}
        effectiveReasoningMode={effectiveReasoningMode}
        supportedReasoningLevels={supportedReasoningLevels}
        onReasoningModeChange={onReasoningModeChange}
        hasTransport={Boolean(transport)}
        busy={busy}
        canSend={canSend}
      />
    </div>
  );
};
