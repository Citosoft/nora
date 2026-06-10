import type { LoopDefinition, LoopOutputEvent, LoopRun, SaveLoopDefinitionPayload, StartLoopRunPayload } from "../../appTypes";

export type LoopRunOutputUpdate = {
  projectId: string;
  runId: string;
  events: LoopOutputEvent[];
};

export interface LoopBridge {
  listLoopDefinitions: (projectId: string) => Promise<LoopDefinition[]>;
  saveLoopDefinition: (payload: SaveLoopDefinitionPayload) => Promise<LoopDefinition>;
  deleteLoopDefinition: (projectId: string, definitionId: string) => Promise<void>;
  listLoopRuns: (projectId: string) => Promise<LoopRun[]>;
  getLoopRun: (projectId: string, runId: string) => Promise<LoopRun | null>;
  deleteLoopRun: (projectId: string, runId: string) => Promise<void>;
  startLoopRun: (payload: StartLoopRunPayload) => Promise<LoopRun>;
  pauseLoopRun: (projectId: string, runId: string) => Promise<LoopRun>;
  resumeLoopRun: (projectId: string, runId: string) => Promise<LoopRun>;
  cancelLoopRun: (projectId: string, runId: string) => Promise<LoopRun>;
  onLoopRunChanged: (listener: (run: LoopRun) => void) => () => void;
  onLoopRunOutput: (listener: (payload: LoopRunOutputUpdate) => void) => () => void;
}

export interface LoopGateway extends LoopBridge {}
