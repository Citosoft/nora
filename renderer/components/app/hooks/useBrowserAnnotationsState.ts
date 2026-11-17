import { useNativeRuntimePorts } from "./useNativeRuntimePorts";
import { useThreadWorkspaceSnapshot } from "./useThreadWorkspaceSnapshot";
import { handoffThread } from "@/components/app/logic/thread-workspace/handoff";
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
import type {
  BrowserAnnotationComposerTarget,
  UseBrowserAnnotationsStateArgs,
  UseBrowserAnnotationsStateResult
} from "@/components/app/types/browserAnnotationContext.types";
import { isAgentToolAvailable } from "@shared/agentToolState";
import type { AgentContextReference, BrowserAnnotation, BrowserElementTarget } from "@shared/appTypes";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useBrowserAnnotationsState({
  projectId,
  browserTabId,
  currentUrl,
  pageTitle,
  workspaceInstructionPath,
  tools,
}: UseBrowserAnnotationsStateArgs): UseBrowserAnnotationsStateResult {
  const native = useNativeRuntimePorts();
  const threads = useThreadWorkspaceSnapshot(native.store);
  const storageScopeKey = useMemo(
    () => buildBrowserAnnotationStorageKey(projectId, browserTabId),
    [browserTabId, projectId]
  );
  const [annotations, setAnnotations] = useState<BrowserAnnotation[]>([]);
  const [composerTarget, setComposerTarget] = useState<BrowserAnnotationComposerTarget | null>(null);
  const [inspectModeEnabled, setInspectModeEnabled] = useState(false);
  const [isSendingReview, setIsSendingReview] = useState(false);

  const availableTools = useMemo(() => tools.filter((tool) => isAgentToolAvailable(tool)), [tools]);
  const runningAgentTargets = useMemo(() => threads.summaries.filter((entry) => !entry.conversation.archivedAt
    && native.boot.workspaces.some((workspace) => workspace.shellProjectId === projectId && workspace.id === entry.conversation.workspace.projectId))
    .map((entry) => ({ id: entry.conversation.id, label: entry.conversation.title, toolLabel: entry.conversation.provider.kind })), [threads.summaries, native.boot.workspaces, projectId]);

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
        ? [{ kind: "workspace-path" as const, label: "Project instructions", value: workspaceInstructionPath }]
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
        await handoffThread(native.store, agentId, prompt.text);
        setAnnotations([]);
        setComposerTarget(null);
        persistAnnotations([]);
      } finally {
        setIsSendingReview(false);
      }
    },
    [annotations.length, buildReviewPromptSubmission, isSendingReview, native.store, native.launch, projectId, persistAnnotations]
  );

  const spawnReviewAgent = useCallback(
    async (_toolId: string) => {
      if (!annotations.length || isSendingReview) {
        return;
      }

      const prompt = buildReviewPromptSubmission();
      if (!prompt.text) {
        return;
      }


      setIsSendingReview(true);
      try {
        const documentId = await native.launch({ projectId, text: prompt.text });
        if (!documentId) return;
        setAnnotations([]);
        setComposerTarget(null);
        persistAnnotations([]);
      } finally {
        setIsSendingReview(false);
      }
    },
    [annotations.length, buildReviewPromptSubmission, isSendingReview, native.store, native.launch, projectId, persistAnnotations]
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
