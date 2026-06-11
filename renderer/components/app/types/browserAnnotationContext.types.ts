import type {
  AgentCatalogEntry,
  AgentContextReference,
  AgentSession,
  BrowserAnnotation,
  BrowserElementTarget
} from "@shared/appTypes";

export type BrowserAnnotationComposerTarget = BrowserElementTarget & {
  key: string;
};

export type BrowserAnnotationAgentTarget = {
  id: string;
  label: string;
  toolLabel: string;
};

export type UseBrowserAnnotationsStateArgs = {
  projectId: string;
  browserTabId: string;
  currentUrl: string;
  pageTitle: string;
  workspaceInstructionPath: string | null;
  agents: AgentSession[];
  tools: AgentCatalogEntry[];
  onFocusAgent: (agentId: string) => void;
};

export type UseBrowserAnnotationsStateResult = {
  annotations: BrowserAnnotation[];
  annotationCount: number;
  composerTarget: BrowserAnnotationComposerTarget | null;
  inspectModeEnabled: boolean;
  isSendingReview: boolean;
  runningAgentTargets: BrowserAnnotationAgentTarget[];
  availableTools: AgentCatalogEntry[];
  toggleInspectMode: () => void;
  disableInspectMode: () => void;
  openComposer: (target: BrowserElementTarget) => void;
  closeComposer: () => void;
  addAnnotation: (target: BrowserElementTarget, body: string) => void;
  updateAnnotation: (id: string, body: string) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  sendReviewToAgent: (agentId: string) => Promise<void>;
  spawnReviewAgent: (toolId: string) => Promise<void>;
  buildReviewReferences: () => AgentContextReference[];
};
