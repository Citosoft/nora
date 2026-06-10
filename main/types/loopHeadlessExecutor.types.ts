import type { LoopHeadlessExecutionResult } from "@shared/types/loopHeadlessLaunch.types";

export type ExecuteLoopHeadlessCommandInput = {
  command: string;
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  onOutput: (chunk: string) => void;
};

export type ExecuteLoopHeadlessCommandHandle = {
  abort: () => void;
  result: Promise<LoopHeadlessExecutionResult>;
};

export type LoopHeadlessExecutor = {
  execute: (input: ExecuteLoopHeadlessCommandInput) => ExecuteLoopHeadlessCommandHandle;
};
