import type { LoopOutputEvent, LoopRoleKind, LoopRoleOutcome, LoopRunEvent, LoopRunRole, LoopRunStatus } from "@shared/appTypes";
import type { RefObject } from "react";

export type LoopRunStageStatus = "pending" | "active" | "complete" | "paused" | "cancelled" | "error";

export interface LoopRunStage {
  id: string;
  title: string;
  description: string;
  status: LoopRunStageStatus;
  role: LoopRunRole | null;
}

export interface LoopRunMarkdownOutputSegment {
  id: string;
  kind: "markdown";
  markdown: string;
}

export interface LoopRunResultOutputSegment {
  id: string;
  kind: "result";
  token: string;
  outcome: LoopRoleOutcome;
  summary: string;
  complete: boolean;
}

export interface LoopRunTurnOutputSegment {
  id: string;
  kind: "turn";
  roleName: string;
  roleKind: LoopRoleKind;
  toolId: string;
  iteration: number;
  phase: "started" | "finished";
  exitCode: number | null;
  aborted: boolean;
}

export interface LoopRunToolOutputSegment {
  id: string;
  kind: "tool";
  command: string;
  output: string;
  status: "completed" | "failed";
}

export interface LoopRunNoticeOutputSegment {
  id: string;
  kind: "notice";
  message: string;
  tone: "info" | "warning";
}

export interface LoopRunUsageOutputSegment {
  id: string;
  kind: "usage";
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
}

export type LoopRunOutputSegment =
  | LoopRunMarkdownOutputSegment
  | LoopRunResultOutputSegment
  | LoopRunTurnOutputSegment
  | LoopRunToolOutputSegment
  | LoopRunNoticeOutputSegment
  | LoopRunUsageOutputSegment;

export type LoopRunAction = "pause" | "resume" | "cancel";

export interface WorkflowRunStatusIconProps {
  status: LoopRunStageStatus;
  className?: string;
}

export interface WorkflowRunProgressProps {
  stages: LoopRunStage[];
}

export interface WorkflowRunOutputProps {
  segments: LoopRunOutputSegment[];
  isActive: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export interface BuildLoopRunOutputInput {
  events: LoopOutputEvent[];
  legacyOutput: string;
}

export interface WorkflowResultBlockProps {
  segment: LoopRunResultOutputSegment;
}

export interface WorkflowRunTimelineProps {
  events: LoopRunEvent[];
  runStatus: LoopRunStatus;
}
