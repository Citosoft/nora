import type { LoopRoleKind, LoopRoleOutcome } from "./loop.types";

export interface LoopOutputEventBase {
  id: string;
  turnId: string;
  roleId: string;
  roleName: string;
  roleKind: LoopRoleKind;
  toolId: string;
  iteration: number;
  createdAt: string;
}

export interface LoopOutputTurnEvent extends LoopOutputEventBase {
  kind: "turn";
  phase: "started" | "finished";
  exitCode: number | null;
  aborted: boolean;
}

export interface LoopOutputMessageEvent extends LoopOutputEventBase {
  kind: "message";
  markdown: string;
}

export interface LoopOutputToolEvent extends LoopOutputEventBase {
  kind: "tool";
  command: string;
  output: string;
  status: "completed" | "failed";
}

export interface LoopOutputNoticeEvent extends LoopOutputEventBase {
  kind: "notice";
  message: string;
  tone: "info" | "warning";
}

export interface LoopOutputResultEvent extends LoopOutputEventBase {
  kind: "result";
  token: string;
  outcome: LoopRoleOutcome;
  summary: string;
}

export interface LoopOutputUsageEvent extends LoopOutputEventBase {
  kind: "usage";
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
}

export type LoopOutputEvent =
  | LoopOutputTurnEvent
  | LoopOutputMessageEvent
  | LoopOutputToolEvent
  | LoopOutputNoticeEvent
  | LoopOutputResultEvent
  | LoopOutputUsageEvent;

export type LoopOutputEventPayload = LoopOutputEvent extends infer Event
  ? Event extends LoopOutputEventBase
    ? Omit<Event, keyof LoopOutputEventBase>
    : never
  : never;
