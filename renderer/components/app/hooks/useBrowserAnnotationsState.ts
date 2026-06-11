import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import { handoffPromptToAgent, sendPromptToAgent } from "@/components/app/logic/agentHandoff";
import {
  buildBrowserAnnotationKey,
  buildBrowserReviewPrompt,
  createBrowserAnnotationId
} from "@/components/app/logic/browserAnnotation";
import {
  buildBrowserAnnotationStorageKey,
  readStoredBrowserAnnotationsForScope,
  writeStoredBrowserAnnotationsForScope
} from "@/components/app/logic/browserAnnotationPersistence";
import { launchAgent } from "@/components/app/logic/launchAgentWithInstruction";
import type {
  BrowserAnnotationComposerTarget,
  UseBrowserAnnotationsStateArgs,
  UseBrowserAnnotationsStateResult
} from "@/components/app/types/browserAnnotationContext.types";
import { isAgentToolAvailable } from "@shared/agentToolState";
import type { AgentContextReference, BrowserAnnotation, BrowserElementTarget, CreateAgentPayload } from "@shared/appTypes";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useBrowserAnnotationsState({
  projectId,
  browserTabId,
  currentUrl,
  pageTitle,
  workspaceInstructionPath,
  agents,
  tools,
  onFocusAgent
}: UseBrowserAnnotationsStateArgs): UseBrowserAnnotationsStateResult {
  const storageScopeKey = useMemo(
    () => buildBrowserAnnotationStorageKey(projectId, browserTabId),
    [browserTabId, projectId]
  );
  const [annotations, setAnnotations] = useState<BrowserAnnotation[]>([]);
  const [composerTarget, setComposerTarget] = useState<BrowserAnnotationComposerTarget | null>(null);
  const [inspectModeEnabled, setInspectModeEnabled] = useState(false);
  const [isSendingReview, setIsSendingReview] = useState(false);

  const availableTools = useMemo(() => tools.filter((tool) => isAgentToolAvailable(tool)), [tools]);
  const runningAgentTargets = useMemo(
    () =>
      agents
        .filter((agent) => agent.status === "running")
        .map((agent) => ({
          id: agent.id,
          label: agent.name.trim() || agent.toolLabel,
          toolLabel: agent.toolLabel
        })),
    [agents]
  );

  const persistAnnotations = useCallback(
    (nextAnnotations: BrowserAnnotation[]) => {
      writeStoredBrowserAnnotationsForScope(storageScopeKey, nextAnnotations);
    },
    [storageScopeKey]
  );

  useEffect(() => {
    setAnnotations(readStoredBrowserAnnotationsForScope(storageScopeKey));
    setComposerTarget(null);
    setInspectModeEnabled(false);
  }, [storageScopeKey]);

  const buildReviewReferences = useCallback((): AgentContextReference[] => {
    const uniqueUrls = [...new Set(annotations.map((annotation) => annotation.target.pageUrl).filter(Boolean))];
    return [
      ...uniqueUrls.map((url) => ({ kind: "workspace-path" as const, label: "Reviewed page", value: url })),
      ...(workspaceInstructionPath
        ? [{ kind: "workspace-path" as const, label: "Workspace instructions", value: workspaceInstructionPath }]
        : [])
    ];
  }, [annotations, workspaceInstructionPath]);

  const buildReviewPromptSubmission = useCallback(() => {
    const promptText = buildBrowserReviewPrompt(annotations);
    return {
      source: "browser-inspect" as const,
      title: "Browser page review",
      text: promptText,
      workspacePaths: workspaceInstructionPath ? [{ path: workspaceInstructionPath, kind: "file" as const }] : [],
      contextSelections: [],
      references: buildReviewReferences()
    };
  }, [annotations, buildReviewReferences, workspaceInstructionPath]);

  const toggleInspectMode = useCallback(() => {
    setInspectModeEnabled((current) => !current);
    setComposerTarget(null);
  }, []);

  const disableInspectMode = useCallback(() => {
    setInspectModeEnabled(false);
  }, []);

  const openComposer = useCallback((target: BrowserElementTarget) => {
    setComposerTarget({
      ...target,
      key: buildBrowserAnnotationKey(target)
    });
  }, []);

  const closeComposer = useCallback(() => {
    setComposerTarget(null);
  }, []);

  const addAnnotation = useCallback(
    (target: BrowserElementTarget, body: string) => {
      const trimmedBody = body.trim();
      if (!trimmedBody) {
        return;
      }

      setAnnotations((current) => {
        const next = [
          ...current,
          {
            id: createBrowserAnnotationId(),
            target: {
              ...target,
              pageUrl: target.pageUrl || currentUrl,
              pageTitle: target.pageTitle || pageTitle
            },
            body: trimmedBody,
            createdAt: new Date().toISOString()
          }
        ];
        persistAnnotations(next);
        return next;
      });
      setComposerTarget(null);
    },
    [currentUrl, pageTitle, persistAnnotations]
  );

  const updateAnnotation = useCallback(
    (id: string, body: string) => {
      const trimmedBody = body.trim();
      if (!trimmedBody) {
        return;
      }

      setAnnotations((current) => {
        const next = current.map((annotation) => (annotation.id === id ? { ...annotation, body: trimmedBody } : annotation));
        persistAnnotations(next);
        return next;
      });
    },
    [persistAnnotations]
  );

  const removeAnnotation = useCallback(
    (id: string) => {
      setAnnotations((current) => {
        const next = current.filter((annotation) => annotation.id !== id);
        persistAnnotations(next);
        return next;
      });
    },
    [persistAnnotations]
  );

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
    setComposerTarget(null);
    persistAnnotations([]);
  }, [persistAnnotations]);

  const sendReviewToAgent = useCallback(
    async (agentId: string) => {
      if (!annotations.length || isSendingReview) {
        return;
      }

      const prompt = buildReviewPromptSubmission();
      if (!prompt.text) {
        return;
      }

      setIsSendingReview(true);
      try {
        await sendPromptToAgent(agentId, prompt, () => undefined);
        setAnnotations([]);
        setComposerTarget(null);
        persistAnnotations([]);
        onFocusAgent(agentId);
      } finally {
        setIsSendingReview(false);
      }
    },
    [annotations.length, buildReviewPromptSubmission, isSendingReview, onFocusAgent, persistAnnotations]
  );

  const spawnReviewAgent = useCallback(
    async (toolId: string) => {
      if (!annotations.length || isSendingReview) {
        return;
      }

      const prompt = buildReviewPromptSubmission();
      if (!prompt.text) {
        return;
      }

      const payload: CreateAgentPayload = {
        toolId,
        name: "Browser Review",
        task: "Review and act on browser inspect comments from the attached prompt.",
        commandOverride: "",
        launchSource: "browser-inspect",
        mode: "read",
        target: { kind: "session-default" }
      };

      setIsSendingReview(true);
      try {
        const launchResult = await launchAgent({
          payload,
          createAgent: noraAgentClient.createAgent
        });
        if (!launchResult) {
          return;
        }

        await handoffPromptToAgent({
          agentId: launchResult.agentId,
          prompt,
          updateSnapshot: () => {},
          focusAgent: async (focusedAgentId: string) => {
            onFocusAgent(focusedAgentId);
          }
        });
        setAnnotations([]);
        setComposerTarget(null);
        persistAnnotations([]);
        onFocusAgent(launchResult.agentId);
      } finally {
        setIsSendingReview(false);
      }
    },
    [annotations.length, buildReviewPromptSubmission, isSendingReview, onFocusAgent, persistAnnotations]
  );

  return {
    annotations,
    annotationCount: annotations.length,
    composerTarget,
    inspectModeEnabled,
    isSendingReview,
    runningAgentTargets,
    availableTools,
    toggleInspectMode,
    disableInspectMode,
    openComposer,
    closeComposer,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    clearAnnotations,
    sendReviewToAgent,
    spawnReviewAgent,
    buildReviewReferences
  };
}
