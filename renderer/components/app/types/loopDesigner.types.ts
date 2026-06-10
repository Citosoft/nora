import type { AgentCatalogEntry, LoopDefinition, LoopRun, LoopRoleDefinition, WorkspaceSummary } from "@shared/appTypes";

export type LoopDesignerStep = "basics" | "writer" | "reviewers" | "limits";

export interface LoopWorkspaceSectionProps {
  workspace: WorkspaceSummary;
  agentCatalog: AgentCatalogEntry[];
  onCreateChangeRequest: (run: LoopRun) => Promise<void>;
}

export interface LoopDefinitionDraft {
  id: string;
  name: string;
  writer: LoopRoleDefinition;
  reviewers: LoopRoleDefinition[];
  maxIterations: number;
  maxDurationMinutes: number;
  roleTimeoutMinutes: number;
  createdAt?: string;
}

export interface LoopDesignerDialogProps {
  open: boolean;
  projectId: string;
  agentCatalog: AgentCatalogEntry[];
  definition: LoopDefinition | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (definition: LoopDefinition) => void;
}

export type LoopRunGoalKind = "spec" | "task" | "custom";
export type LoopRunStep = "goal" | "limits" | "review";

export interface LoopRunLimitsDraft {
  maxIterations: number;
  maxDurationMinutes: number;
  roleTimeoutMinutes: number;
}

export interface LoopRunDialogProps {
  open: boolean;
  definition: LoopDefinition | null;
  onOpenChange: (open: boolean) => void;
  onStarted: (run: LoopRun) => void;
}

export interface LoopRunMonitorDialogProps {
  open: boolean;
  run: LoopRun | null;
  onOpenChange: (open: boolean) => void;
  onRunChanged: (run: LoopRun) => void;
  onCreateChangeRequest: (run: LoopRun) => Promise<void>;
}
