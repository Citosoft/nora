import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { ReactNode } from "react";
import type { AgentCatalogEntry, LoopDefinition, LoopRoleDefinition, LoopRoleKind, LoopRun, LoopRunStatus, WorkspaceSummary } from "@shared/appTypes";
import type { LoopLimitsDraft } from "@shared/loopLimits";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ModelCatalogStore } from "@/components/app/types/modelPicker.types";
import type { WorkflowRunTask } from "@/components/app/types/workflowLaunch.types";

/** "form" keeps wizards to a readable column; "wide" gives the run monitor room for progress beside output. */
export type WorkflowSurfaceWidth = "form" | "wide";
export interface WorkflowSurfaceProps {
  title: string; onBack(): void; width?: WorkflowSurfaceWidth; footer?: ReactNode; children: ReactNode;
}
export interface WorkflowStepHeaderProps { title: string; description: string; }
export interface WorkflowLimitsFieldsProps { value: LoopLimitsDraft; onChange(next: LoopLimitsDraft): void; }
export interface WorkflowAgentSummary {
  id: string; name: string; toolId: string; toolLabel: string; model: string | null; kind: LoopRoleKind;
  botId?: string;
  avatar?: BotDefinition["avatar"];
}
export interface WorkflowAgentAvatarProps { agent: WorkflowAgentSummary; size: number; }
/** The agent and model a workflow role runs on; a null model uses the agent's own default. */
export interface WorkflowAgentChoice { toolId: string; instanceId?: string | null; model: string | null; }
export interface WorkflowAgentFieldsProps {
  /** Installed thread providers the role can run on. */
  tools: readonly AgentCatalogEntry[];
  providers: readonly NativeProvider[];
  /** Model catalogs for the workflow's workspace, or null when it has no native workspace to list models from. */
  catalogs: ModelCatalogStore | null;
  value: WorkflowAgentChoice;
  onChange(next: WorkflowAgentChoice): void;
}
export interface WorkflowModelSelectProps {
  provider: NativeProvider;
  catalogs: ModelCatalogStore;
  toolId: string;
  model: string | null;
  onChange(model: string | null): void;
}
export interface WorkflowAgentListProps { agents: WorkflowAgentSummary[]; }
export interface WorkflowDetailListProps { items: readonly (readonly [label: string, value: ReactNode])[]; }
export interface WorkflowRunStatusBadgeProps { status: LoopRunStatus; }
export interface WorkflowDefinitionRowProps { definition: LoopDefinition; agents: WorkflowAgentSummary[]; onEdit(): void; onRun(): void; onDelete(): void; }
export interface WorkflowAgentChipsProps { agents: WorkflowAgentSummary[]; }
export interface WorkflowRunRowProps { run: LoopRun; needsInput: boolean; onOpen(): void; onDelete: (() => void) | null; }
export interface WorkflowDesignerProps {
  projectId: string; agentCatalog: AgentCatalogEntry[]; definition: LoopDefinition | null;
  onBack(): void; onSaved(definition: LoopDefinition): void;
}
export interface WorkflowRunSetupProps {
  definition: LoopDefinition;
  /** Prefills the goal with this task when the run was launched from the task list. */
  task: WorkflowRunTask | null;
  onBack(): void; onStarted(run: LoopRun): void;
}
export interface WorkflowRunMonitorProps {
  run: LoopRun; onBack(): void; onRunChanged(run: LoopRun): void; onCreateChangeRequest(run: LoopRun): Promise<void>;
}
export interface WorkspaceWorkflowsProps { workspace: WorkspaceSummary; agentCatalog: AgentCatalogEntry[]; onCreateChangeRequest(run: LoopRun): Promise<void>; }
export type WorkflowSelection = { kind: "overview" } | { kind: "design"; definition: LoopDefinition | null }
  | { kind: "run"; definition: LoopDefinition; task: WorkflowRunTask | null } | { kind: "monitor"; runId: string };

export interface WorkflowStageEditorProps extends Omit<WorkflowAgentFieldsProps, "value" | "onChange"> {
  stage: LoopRoleDefinition;
  stages: readonly LoopRoleDefinition[];
  expanded: boolean;
  onToggle(): void;
  index: number;
  count: number;
  bots: readonly BotDefinition[];
  onChange(partial: Partial<LoopRoleDefinition>): void;
  onRemove(): void;
  onMove(direction: -1 | 1): void;
}

export interface WorkflowRequestTarget {
  conversationId: string;
  stageName: string;
  bot?: Pick<BotDefinition, "name" | "avatar">;
}
export interface WorkflowRequestsProps { run: LoopRun; }
export interface WorkflowThreadRequestsProps { target: WorkflowRequestTarget; }
