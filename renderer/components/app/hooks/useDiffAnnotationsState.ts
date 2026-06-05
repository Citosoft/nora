import { noraSessionClient } from "@/components/app/clients/noraSessionClient";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { sendPromptToAgent } from "@/components/app/logic/agentHandoff";
import {
  buildDiffAnnotationKey,
  buildDiffReviewPrompt,
  createDiffAnnotationId
} from "@/components/app/logic/diffAnnotation";
import {
  buildDiffAnnotationStorageKey,
  readStoredDiffAnnotationsForScope,
  writeStoredDiffAnnotationsForScope
} from "@/components/app/logic/diffAnnotationPersistence";
import type {
  DiffAnnotationComposerTarget,
  DiffAnnotationContextValue
} from "@/components/app/types/diffAnnotationContext.types";
import type { DiffAnnotation, DiffAnnotationLineTarget } from "@shared/appTypes";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useDiffAnnotationsState(): DiffAnnotationContextValue {
  const snapshot = useCanonicalAppSnapshot();
  const projectId = snapshot?.project?.id ?? null;
  const changesRoot = snapshot?.changesRoot ?? null;
  const storageScopeKey = useMemo(
    () => (projectId ? buildDiffAnnotationStorageKey(projectId, changesRoot) : null),
    [changesRoot, projectId]
  );
  const annotationsEnabled = Boolean(snapshot?.project && !snapshot.selectedCommitHash);
  const [annotations, setAnnotations] = useState<DiffAnnotation[]>([]);
  const [composerTarget, setComposerTarget] = useState<DiffAnnotationComposerTarget | null>(null);
  const [isSendingReview, setIsSendingReview] = useState(false);

  const persistAnnotations = useCallback(
    (nextAnnotations: DiffAnnotation[]) => {
      if (!storageScopeKey) {
        return;
      }
      writeStoredDiffAnnotationsForScope(storageScopeKey, nextAnnotations);
    },
    [storageScopeKey]
  );

  useEffect(() => {
    if (!storageScopeKey) {
      setAnnotations([]);
      setComposerTarget(null);
      return;
    }

    setAnnotations(readStoredDiffAnnotationsForScope(storageScopeKey));
    setComposerTarget(null);
  }, [storageScopeKey]);

  const runningAgentTargets = useMemo(() => {
    if (!snapshot?.project) {
      return [];
    }

    const workspace = snapshot.workspaces.find((entry) => entry.project.id === snapshot.project?.id);
    return (workspace?.agents ?? [])
      .filter((agent) => agent.status === "running")
      .map((agent) => ({
        id: agent.id,
        label: agent.name.trim() || agent.toolLabel,
        toolLabel: agent.toolLabel
      }));
  }, [snapshot?.project, snapshot?.workspaces]);

  const openComposer = useCallback((target: DiffAnnotationLineTarget) => {
    setComposerTarget({
      ...target,
      key: buildDiffAnnotationKey(target.path, target.oldLine, target.newLine)
    });
  }, []);

  const closeComposer = useCallback(() => {
    setComposerTarget(null);
  }, []);

  const addAnnotation = useCallback(
    (target: DiffAnnotationLineTarget, body: string) => {
      const trimmedBody = body.trim();
      if (!trimmedBody) {
        return;
      }

      setAnnotations((current) => {
        const next = [
          ...current,
          {
            id: createDiffAnnotationId(),
            target,
            body: trimmedBody,
            createdAt: new Date().toISOString()
          }
        ];
        persistAnnotations(next);
        return next;
      });
      setComposerTarget(null);
    },
    [persistAnnotations]
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

  const getAnnotationsForLine = useCallback(
    (path: string, oldLine: number | null, newLine: number | null) => {
      const key = buildDiffAnnotationKey(path, oldLine, newLine);
      return annotations.filter(
        (annotation) => buildDiffAnnotationKey(annotation.target.path, annotation.target.oldLine, annotation.target.newLine) === key
      );
    },
    [annotations]
  );

  const getAnnotationCountForPath = useCallback(
    (path: string) => annotations.filter((annotation) => annotation.target.path === path).length,
    [annotations]
  );

  const sendReviewToAgent = useCallback(
    async (agentId: string) => {
      if (!annotations.length || isSendingReview) {
        return;
      }

      const promptText = buildDiffReviewPrompt(annotations);
      if (!promptText) {
        return;
      }

      setIsSendingReview(true);
      try {
        await noraSessionClient.focusAgent(agentId);
        await sendPromptToAgent(
          agentId,
          {
            source: "diff-review",
            title: "Diff review feedback",
            text: promptText,
            workspacePaths: [],
            contextSelections: []
          },
          () => undefined
        );
        setAnnotations([]);
        setComposerTarget(null);
        persistAnnotations([]);
      } finally {
        setIsSendingReview(false);
      }
    },
    [annotations, isSendingReview, persistAnnotations]
  );

  return {
    annotationsEnabled,
    annotations,
    annotationCount: annotations.length,
    composerTarget,
    isSendingReview,
    openComposer,
    closeComposer,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    clearAnnotations,
    getAnnotationsForLine,
    getAnnotationCountForPath,
    sendReviewToAgent,
    runningAgentTargets
  };
}
