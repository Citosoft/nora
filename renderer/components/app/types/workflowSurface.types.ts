import type { ReactNode } from "react";
import type { AgentCatalogEntry, LoopDefinition, LoopRun, WorkspaceSummary } from "@shared/appTypes";

export interface WorkflowSurfaceProps { title: string; onBack(): void; children: ReactNode; }
export interface WorkflowSurfacePartProps { children: ReactNode; className?: string; }
export interface WorkflowDesignerProps {
  projectId: string; agentCatalog: AgentCatalogEntry[]; definition: LoopDefinition | null;
  onBack(): void; onSaved(definition: LoopDefinition): void;
}
export interface WorkflowRunSetupProps { definition: LoopDefinition; onBack(): void; onStarted(run: LoopRun): void; }
export interface WorkflowRunMonitorProps {
  run: LoopRun; onBack(): void; onRunChanged(run: LoopRun): void; onCreateChangeRequest(run: LoopRun): Promise<void>;
}
export interface WorkspaceWorkflowsProps { workspace: WorkspaceSummary; agentCatalog: AgentCatalogEntry[]; onCreateChangeRequest(run: LoopRun): Promise<void>; }
export type WorkflowSelection = { kind: "overview" } | { kind: "design"; definition: LoopDefinition | null }
  | { kind: "run"; definition: LoopDefinition } | { kind: "monitor"; runId: string };
