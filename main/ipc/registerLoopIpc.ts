import type { SaveLoopDefinitionPayload, StartLoopRunPayload } from "@shared/appTypes";
import { ipcMain } from "electron";
import type { LoopRunner } from "@main/types/loopRunner.types";

interface RegisterLoopIpcDeps {
  loopRunner: LoopRunner;
}

export function registerLoopIpc({ loopRunner }: RegisterLoopIpcDeps): void {
  ipcMain.handle("app:list-loop-definitions", (_event, projectId: string) => loopRunner.listDefinitions(projectId));
  ipcMain.handle("app:save-loop-definition", (_event, payload: SaveLoopDefinitionPayload) => loopRunner.saveDefinition(payload));
  ipcMain.handle("app:delete-loop-definition", (_event, projectId: string, definitionId: string) =>
    loopRunner.deleteDefinition(projectId, definitionId));
  ipcMain.handle("app:list-loop-runs", (_event, projectId: string) => loopRunner.listRuns(projectId));
  ipcMain.handle("app:get-loop-run", (_event, projectId: string, runId: string) => loopRunner.getRun(projectId, runId));
  ipcMain.handle("app:delete-loop-run", (_event, projectId: string, runId: string) => loopRunner.deleteRun(projectId, runId));
  ipcMain.handle("app:start-loop-run", (_event, payload: StartLoopRunPayload) => loopRunner.startRun(payload));
  ipcMain.handle("app:pause-loop-run", (_event, projectId: string, runId: string) => loopRunner.pauseRun(projectId, runId));
  ipcMain.handle("app:resume-loop-run", (_event, projectId: string, runId: string) => loopRunner.resumeRun(projectId, runId));
  ipcMain.handle("app:cancel-loop-run", (_event, projectId: string, runId: string) => loopRunner.cancelRun(projectId, runId));
}
