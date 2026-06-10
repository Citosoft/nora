import type { LoopRoleKind } from "./loop.types";

export type LoopHeadlessLaunchInput = {
  toolId: string;
  roleKind: LoopRoleKind;
  detectedCommand: string;
  prompt: string;
  workspacePath: string;
  isWindowsPlatform?: boolean;
};

export type LoopHeadlessExecutionResult = {
  output: string;
  exitCode: number | null;
  aborted: boolean;
};
