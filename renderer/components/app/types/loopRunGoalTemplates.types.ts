import type { LoopRunGoalKind, LoopRunLimitsDraft } from "@/components/app/types/loopDesigner.types";

export type LoopRunGoalTemplateKind = LoopRunGoalKind | "any";
export type LoopRunGoalTemplateCategory = "quick" | "delivery" | "improvement" | "maintenance";

export interface LoopRunGoalTemplate {
  id: string;
  label: string;
  description: string;
  category: LoopRunGoalTemplateCategory;
  /** Preferred goal source. Falls back to custom when spec/task files are unavailable. */
  goalKind: LoopRunGoalTemplateKind;
  objective: string;
  /** Optional run-only guardrail tweaks, mainly for smoke testing. */
  limits?: Partial<LoopRunLimitsDraft>;
}

export interface LoopRunGoalTemplateGroup {
  id: LoopRunGoalTemplateCategory;
  label: string;
  templates: LoopRunGoalTemplate[];
}

export interface ApplyLoopRunGoalTemplateInput {
  template: LoopRunGoalTemplate;
  specsAvailable: boolean;
  tasksAvailable: boolean;
  selectedSpecPath: string;
  selectedTaskPath: string;
  firstSpecPath: string;
  firstTaskPath: string;
  limitsDraft: LoopRunLimitsDraft;
}

export interface ApplyLoopRunGoalTemplateResult {
  goalKind: LoopRunGoalKind;
  selectedSpecPath: string;
  selectedTaskPath: string;
  objective: string;
  limitsDraft: LoopRunLimitsDraft;
}
