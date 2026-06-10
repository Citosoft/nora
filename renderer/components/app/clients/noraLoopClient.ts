import type { LoopBridge } from "@shared/ipc/types/loopGateway.types";

export const noraLoopClient: LoopBridge = {
  listLoopDefinitions: (projectId) => window.nora.listLoopDefinitions(projectId),
  saveLoopDefinition: (payload) => window.nora.saveLoopDefinition(payload),
  deleteLoopDefinition: (projectId, definitionId) => window.nora.deleteLoopDefinition(projectId, definitionId),
  listLoopRuns: (projectId) => window.nora.listLoopRuns(projectId),
  getLoopRun: (projectId, runId) => window.nora.getLoopRun(projectId, runId),
  deleteLoopRun: (projectId, runId) => window.nora.deleteLoopRun(projectId, runId),
  startLoopRun: (payload) => window.nora.startLoopRun(payload),
  pauseLoopRun: (projectId, runId) => window.nora.pauseLoopRun(projectId, runId),
  resumeLoopRun: (projectId, runId) => window.nora.resumeLoopRun(projectId, runId),
  cancelLoopRun: (projectId, runId) => window.nora.cancelLoopRun(projectId, runId),
  onLoopRunChanged: (listener) => window.nora.onLoopRunChanged(listener),
  onLoopRunOutput: (listener) => window.nora.onLoopRunOutput(listener)
};
