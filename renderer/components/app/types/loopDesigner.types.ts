import type { LoopRoleDefinition } from "@shared/appTypes";

export type LoopDesignerStep = "basics" | "writer" | "reviewers" | "limits";

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


export type LoopRunGoalKind = "spec" | "task" | "custom";
export type LoopRunStep = "goal" | "limits" | "review";

export interface LoopRunLimitsDraft {
  maxIterations: number;
  maxDurationMinutes: number;
  roleTimeoutMinutes: number;
}
