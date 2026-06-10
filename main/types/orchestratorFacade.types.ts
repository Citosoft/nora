import type { AppState } from "@shared/appTypes";
import type { MainServices } from "./mainServices.types";
import type { PreparedLoopRunWorktree, PrepareLoopRunWorktreeInput } from "./prepareLoopRunWorktree.types";

export interface OrchestratorFacade {
  createServices: () => MainServices;
  onStateChanged: (listener: (state: AppState) => void) => () => void;
  onAgentTerminalData: (listener: (sessionId: string, data: string) => void) => () => void;
  initialize: () => Promise<AppState>;
  prepareLoopRunWorktree: (input: PrepareLoopRunWorktreeInput) => Promise<PreparedLoopRunWorktree>;
  resolveLoopToolLaunch: (toolId: string) => { detectedCommand: string; env: Record<string, string> };
}
