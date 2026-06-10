import type { LoopRun } from "@shared/appTypes";
import type { LoopBridge } from "@shared/ipc/types/loopGateway.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createLoopBridge(): LoopBridge {
  return {
    listLoopDefinitions: (projectId) => invokeIpc("app:list-loop-definitions", projectId),
    saveLoopDefinition: (payload) => invokeIpc("app:save-loop-definition", payload),
    deleteLoopDefinition: (projectId, definitionId) => invokeIpc("app:delete-loop-definition", projectId, definitionId),
    listLoopRuns: (projectId) => invokeIpc("app:list-loop-runs", projectId),
    getLoopRun: (projectId, runId) => invokeIpc("app:get-loop-run", projectId, runId),
    deleteLoopRun: (projectId, runId) => invokeIpc("app:delete-loop-run", projectId, runId),
    startLoopRun: (payload) => invokeIpc("app:start-loop-run", payload),
    pauseLoopRun: (projectId, runId) => invokeIpc("app:pause-loop-run", projectId, runId),
    resumeLoopRun: (projectId, runId) => invokeIpc("app:resume-loop-run", projectId, runId),
    cancelLoopRun: (projectId, runId) => invokeIpc("app:cancel-loop-run", projectId, runId),
    onLoopRunChanged: (listener) => subscribeToIpcEvent<LoopRun>("loop-run:changed", listener),
    onLoopRunOutput: (listener) => subscribeToIpcEvent<import("@shared/ipc/types/loopGateway.types").LoopRunOutputUpdate>("loop-run:output", listener)
  };
}
