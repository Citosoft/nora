import type { LoopOutputEvent, LoopRoleKind } from "@shared/appTypes";

export interface LoopOutputNormalizerContext {
  turnId: string;
  roleId: string;
  roleName: string;
  roleKind: LoopRoleKind;
  toolId: string;
  iteration: number;
  token: string;
  nowIso: () => string;
  randomId: () => string;
}

export interface LoopOutputNormalizer {
  push: (chunk: string) => LoopOutputEvent[];
  finish: (finalOutput: string) => LoopOutputEvent[];
  getProtocolText: () => string;
}
