import type { DiffAnnotation, DiffAnnotationLineTarget } from "@shared/appTypes";

export type DiffAnnotationComposerTarget = DiffAnnotationLineTarget & {
  key: string;
};

export type DiffAnnotationContextValue = {
  annotationsEnabled: boolean;
  annotations: DiffAnnotation[];
  annotationCount: number;
  composerTarget: DiffAnnotationComposerTarget | null;
  isSendingReview: boolean;
  openComposer: (target: DiffAnnotationLineTarget) => void;
  closeComposer: () => void;
  addAnnotation: (target: DiffAnnotationLineTarget, body: string) => void;
  updateAnnotation: (id: string, body: string) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  getAnnotationsForLine: (path: string, oldLine: number | null, newLine: number | null) => DiffAnnotation[];
  getAnnotationCountForPath: (path: string) => number;
  sendReviewToAgent: (agentId: string) => Promise<void>;
  runningAgentTargets: Array<{ id: string; label: string; toolLabel: string }>;
};
